import { useCallback, useEffect, useRef, useState } from 'react';

export type ScannerStatus = 'starting' | 'scanning' | 'unsupported' | 'denied' | 'paused';

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

const SCAN_INTERVAL = 300;

/**
 * Камера + распознавание QR через встроенный BarcodeDetector
 * (Chrome/Edge на Android, Safari 17+). Где его нет — статус 'unsupported',
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
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      setStatus('unsupported');
      return;
    }

    let cancelled = false;
    let timer: number | undefined;
    const detector = new Detector({ formats: ['qr_code'] });

    const tick = async () => {
      const video = videoRef.current;
      if (cancelled || !video) return;
      if (video.readyState >= 2) {
        try {
          const [code] = await detector.detect(video);
          if (code?.rawValue && !cancelled) {
            onDetectRef.current(code.rawValue);
            return; // дальше решает экран: пауза/повтор
          }
        } catch {
          /* кадр не распознан — пробуем следующий */
        }
      }
      timer = window.setTimeout(tick, SCAN_INTERVAL);
    };

    setStatus('starting');
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
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
        setStatus('scanning');
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
