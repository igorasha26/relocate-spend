import { useRef, useState, type PointerEvent } from 'react';

interface Options {
  /** Палец ушёл влево (контент листается вперёд). */
  onSwipeLeft?: () => void;
  /** Палец ушёл вправо (контент листается назад). */
  onSwipeRight?: () => void;
  /** Можно ли листать в эту сторону — иначе жест упирается с «резинкой». */
  canSwipeLeft?: boolean;
  canSwipeRight?: boolean;
  threshold?: number;
}

const START = 10;

/**
 * Горизонтальный свайп по блоку, не мешающий вертикальной прокрутке.
 * Возвращает обработчики и текущее смещение — чтобы блок ехал за пальцем.
 */
export function useHorizontalSwipe({
  onSwipeLeft,
  onSwipeRight,
  canSwipeLeft = true,
  canSwipeRight = true,
  threshold = 60,
}: Options) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);

  const handlers = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      suppressClick.current = false;
      gesture.current = { x: e.clientX, y: e.clientY, active: false };
    },
    onPointerMove(e: PointerEvent<HTMLElement>) {
      const g = gesture.current;
      if (!g) return;
      const dx = e.clientX - g.x;
      const dy = e.clientY - g.y;
      if (!g.active) {
        if (Math.abs(dy) > START && Math.abs(dy) > Math.abs(dx)) {
          gesture.current = null;
          return;
        }
        if (Math.abs(dx) < START) return;
        g.active = true;
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      const blocked = (dx < 0 && !canSwipeLeft) || (dx > 0 && !canSwipeRight);
      setOffset(blocked ? dx / 5 : dx * 0.6);
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const g = gesture.current;
      gesture.current = null;
      if (!g?.active) return;
      suppressClick.current = true;
      const dx = e.clientX - g.x;
      setDragging(false);
      setOffset(0);
      if (dx <= -threshold && canSwipeLeft) onSwipeLeft?.();
      if (dx >= threshold && canSwipeRight) onSwipeRight?.();
    },
    onPointerCancel() {
      gesture.current = null;
      setDragging(false);
      setOffset(0);
    },
    // Нажатие в конце свайпа (например, по сегменту диаграммы) — не клик
    onClickCapture(e: { preventDefault(): void; stopPropagation(): void }) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  return { handlers, offset, dragging };
}
