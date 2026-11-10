import { useLayoutEffect, useRef, type ReactNode } from 'react';
import { useDragX } from '@/shared/hooks/useDragX';
import styles from './Pager.module.css';

interface Props {
  /** Ключ текущей страницы — когда он меняется, лента без анимации встаёт в центр. */
  pageKey: string;
  prev: ReactNode;
  current: ReactNode;
  next: ReactNode;
  canPrev?: boolean;
  canNext?: boolean;
  onChange: (dir: 1 | -1) => void;
  className?: string;
}

const SETTLE_MS = 300;

/**
 * Листание страницами (как в iOS): соседние страницы уже отрисованы
 * и выезжают за пальцем. Во время жеста React не перерисовывает ничего —
 * лента двигается напрямую через transform, поэтому без рывков.
 */
export function Pager({ pageKey, prev, current, next, canPrev = true, canNext = true, onChange, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  const place = (dx: number, animate: boolean) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.transition = animate ? `transform ${SETTLE_MS}ms var(--ease)` : 'none';
    track.style.transform = `translate3d(calc(-100% / 3 + ${dx}px), 0, 0)`;
  };

  // Новая страница пришла — до отрисовки кадра ставим ленту в центр (без «прыжка»)
  useLayoutEffect(() => {
    window.clearTimeout(timer.current);
    place(0, false);
  }, [pageKey]);

  const handlers = useDragX({
    onMove: (dx) => {
      const blocked = (dx > 0 && !canPrev) || (dx < 0 && !canNext);
      place(blocked ? dx / 4 : dx, false);
    },
    onRelease: (dx, velocity) => {
      const width = rootRef.current?.offsetWidth ?? 320;
      // Листаем, если протащили на четверть ширины или резко смахнули
      const flick = Math.abs(velocity) > 0.45;
      const dir: 1 | -1 | 0 =
        (dx < 0 && (dx < -width / 4 || flick) && canNext) ? 1 : (dx > 0 && (dx > width / 4 || flick) && canPrev) ? -1 : 0;
      place(dir === 0 ? 0 : -dir * width, true);
      if (dir !== 0) timer.current = window.setTimeout(() => onChange(dir), SETTLE_MS);
    },
  });

  return (
    <div ref={rootRef} className={`${styles.root} ${className ?? ''}`} {...handlers}>
      <div ref={trackRef} className={styles.track}>
        <div className={styles.page} aria-hidden>
          {prev}
        </div>
        <div className={styles.page}>{current}</div>
        <div className={styles.page} aria-hidden>
          {next}
        </div>
      </div>
    </div>
  );
}
