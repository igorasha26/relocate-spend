import { useCallback, useEffect, useRef, useState } from 'react';

export type ScannerStatus = 'starting' | 'scanning' | 'unsupported' | 'denied' | 'paused';

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const SCAN_INTERVAL = 250;
/** Сторона квадрата, в который ужимается центр кадра для jsQR: чек плотный, меньше — не читается. */
const JSQR_SIZE = 900;

type Decode = (video: HTMLVideoElement) => Promise<string | null>;

/** Встроенный детектор браузера (Chrome на Android). */
function nativeDecoder(Detector: BarcodeDetectorCtor): Decode {
  const detector = new Detector({ formats: ['qr_code'] });
  return async (video) => {
    const [code] = await detector.detect(video);
    return code?.rawValue ?? null;
  };
}

/**
 * Запасной распознаватель на JS (iPhone: в Safari нет BarcodeDetector).
 * Библиотека грузится только здесь — в основной бандл не попадает.
 * Берём центральный квадрат кадра (туда смотрит рамка), ужимаем и отдаём jsQR.
 */
async function jsDecoder(): Promise<Decode> {
  const { default: jsQR } = await import('jsqr');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('no canvas');
  return async (video) => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;
    const side = Math.min(w, h);
    const size = Math.min(side, JSQR_SIZE);
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(video, (w - side) / 2, (h - side) / 2, side, side, 0, 0, size, size);
    const image = ctx.getImageData(0, 0, size, size);
    return jsQR(image.data, size, size, { inversionAttempts: 'dontInvert' })?.data ?? null;
  };
}

/**
 * Камера + распознавание QR: встроенный BarcodeDetector, где он есть,
 * иначе библиотека jsQR (iPhone). Нет камеры — статус 'unsupported',
 * и экран предлагает ввести расход вручную.
 */
export function useQrScanner(onDetect: (text: string) => void, enabled: boolean) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const onDetectRef = useRef(onDetect);
  const [status, setStatus] = useState<ScannerStatus>('starting');
  const [torchOn, setTorchOn] = useState(false);
  const [torchSupported, setTorchSupported] = useState(false);

  useEffect(() => {
    onDetectRef.current = onDetect;
  });

  useEffect(() => {
    if (!enabled) {
      setStatus('paused');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;

    let cancelled = false;
    let timer: number | undefined;
    let decode: Decode | null = null;

    const tick = async () => {
      const video = videoRef.current;
      if (cancelled || !video) return;
      if (decode && video.readyState >= 2) {
        try {
          const text = await decode(video);
          if (text && !cancelled) {
            onDetectRef.current(text);
            return; // дальше решает экран: пауза/повтор
          }
        } catch {
          /* кадр не распознан — пробуем следующий */
        }
      }
      timer = window.setTimeout(tick, SCAN_INTERVAL);
    };

    const decoderReady = (Detector ? Promise.resolve(nativeDecoder(Detector)) : jsDecoder()).then(
      (d) => {
        decode = d;
      },
      () => !cancelled && setStatus('unsupported'),
    );

    setStatus('starting');
    navigator.mediaDevices
      // Повыше разрешение: QR сербского чека плотный, на 640×480 его не прочитать
      .getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false })
      .then(async (stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const track = stream.getVideoTracks()[0];
        const caps = track?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
        setTorchSupported(Boolean(caps?.torch));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        await decoderReady;
        if (cancelled) return;
        setStatus((cur) => (cur === 'unsupported' ? cur : 'scanning'));
        tick();
      })
      .catch(() => !cancelled && setStatus('denied'));

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setTorchOn(false);
    };
  }, [enabled]);

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as MediaTrackConstraintSet] });
      setTorchOn(next);
    } catch {
      setTorchSupported(false);
    }
  }, [torchOn]);

  return { videoRef, status, torchOn, torchSupported, toggleTorch };
}
