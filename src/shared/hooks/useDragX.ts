import { useRef, type PointerEvent } from 'react';

interface Options {
  /** Вызывается на каждом кадре движения пальца (через rAF, без React-рендера). */
  onMove: (dx: number) => void;
  /** Палец отпущен после горизонтального жеста. */
  onRelease: (dx: number, velocity: number) => void;
}

const START = 8;

/**
 * Низкоуровневый горизонтальный жест: определяет направление (не мешая вертикальной прокрутке),
 * отдаёт смещение по кадрам анимации и скорость в момент отпускания.
 * Сам ничего не рендерит — двигать элементы нужно напрямую через style.transform.
 */
export function useDragX({ onMove, onRelease }: Options) {
  const gesture = useRef<{ x: number; y: number; active: boolean; lastX: number; lastT: number; v: number } | null>(null);
  const frame = useRef(0);
  const pending = useRef(0);
  const suppressClick = useRef(false);

  const handlers = {
    onPointerDown(e: PointerEvent<HTMLElement>) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      suppressClick.current = false;
      gesture.current = { x: e.clientX, y: e.clientY, active: false, lastX: e.clientX, lastT: e.timeStamp, v: 0 };
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
        e.currentTarget.setPointerCapture(e.pointerId);
      }
      const dt = e.timeStamp - g.lastT;
      if (dt > 0) g.v = (e.clientX - g.lastX) / dt;
      g.lastX = e.clientX;
      g.lastT = e.timeStamp;
      pending.current = dx;
      if (!frame.current) {
        frame.current = requestAnimationFrame(() => {
          frame.current = 0;
          onMove(pending.current);
        });
      }
    },
    onPointerUp(e: PointerEvent<HTMLElement>) {
      const g = gesture.current;
      gesture.current = null;
      if (!g?.active) return;
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      suppressClick.current = true;
      onRelease(e.clientX - g.x, g.v);
    },
    onPointerCancel() {
      const g = gesture.current;
      gesture.current = null;
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      if (g?.active) onRelease(0, 0);
    },
    /** Клик в конце жеста — часть свайпа, а не нажатие. */
    onClickCapture(e: { preventDefault(): void; stopPropagation(): void }) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
  };

  return handlers;
}
