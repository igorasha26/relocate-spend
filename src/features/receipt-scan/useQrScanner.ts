import { useCallback, useEffect, useRef, useState } from 'react';

export type ScannerStatus = 'starting' | 'scanning' | 'unsupported' | 'denied' | 'paused';

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const SCAN_INTERVAL = 120;

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
 * ZXing (C++ в WebAssembly) — для iPhone, где в Safari нет BarcodeDetector.
 * Плотный QR сербского чека читает за 10–25 мс даже размытым и с тенью (jsQR — через раз и до 0,8 с).
 * Библиотека и wasm-файл (~1 МБ) грузятся только при открытии сканера и дальше берутся из кеша.
 * Распознаём весь кадр, а не только центр: код не обязан стоять ровно в рамке.
 */
async function zxingDecoder(): Promise<Decode> {
  const [{ prepareZXingModule, readBarcodes }, { default: wasmUrl }] = await Promise.all([
    import('zxing-wasm/reader'),
    import('zxing-wasm/reader/zxing_reader.wasm?url'),
  ]);
  prepareZXingModule({
    overrides: { locateFile: (path: string, prefix: string) => (path.endsWith('.wasm') ? wasmUrl : prefix + path) },
  });
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('no canvas');
  return async (video) => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.drawImage(video, 0, 0, w, h);
    const [result] = await readBarcodes(ctx.getImageData(0, 0, w, h), {
      formats: ['QRCode'],
      tryHarder: true,
      maxNumberOfSymbols: 1,
    });
    return result?.isValid ? result.text : null;
  };
}

/**
 * Камера + распознавание QR: встроенный BarcodeDetector, где он есть,
 * иначе ZXing в WebAssembly (iPhone). Нет камеры — статус 'unsupported',
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

    const decoderReady = (Detector ? Promise.resolve(nativeDecoder(Detector)) : zxingDecoder()).then(
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
