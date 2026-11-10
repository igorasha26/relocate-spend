import { useEffect, useLayoutEffect, useRef, type ReactNode } from 'react';
import { useDragX } from '@/shared/hooks/useDragX';
import { cn } from '@/shared/lib/cn';
import styles from './SpendingOverview.module.css';

interface Props {
  /** Ключ текущего периода — при смене карусель встаёт в центр до отрисовки кадра. */
  periodKey: string;
  prev: ReactNode;
  current: ReactNode;
  /** null — следующего периода нет (будущее), справа пусто. */
  next: ReactNode | null;
  onShift: (dir: 1 | -1) => void;
  height: number;
}

const SETTLE_MS = 340;
/** Расстояние между центрами колец относительно ширины карусели. */
const STEP = 0.56;

/**
 * Карусель периодов: по бокам выглядывают кольца соседних месяцев.
 * Во время жеста React ничего не перерисовывает — слоты двигаются
 * напрямую через transform (GPU), поэтому листание плавное.
 */
export function PeriodCarousel({ periodKey, prev, current, next, onShift, height }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const slots = useRef<Record<'prev' | 'current' | 'next', HTMLDivElement | null>>({ prev: null, current: null, next: null });
  const timer = useRef<number | undefined>(undefined);
  const hasNext = next !== null;

  const place = (offset: number, animate: boolean) => {
    const width = rootRef.current?.offsetWidth ?? 360;
    const step = width * STEP;
    (['prev', 'current', 'next'] as const).forEach((key, i) => {
      const el = slots.current[key];
      if (!el) return;
      const x = (i - 1) * step + offset;
      const distance = Math.min(Math.abs(x) / step, 1);
      el.style.transition = animate ? `transform ${SETTLE_MS}ms var(--ease), opacity ${SETTLE_MS}ms var(--ease)` : 'none';
      el.style.transform = `translate3d(${x}px, 0, 0) scale(${1 - 0.18 * distance})`;
      el.style.opacity = String(1 - 0.62 * distance);
    });
  };

  // Новый период: ставим слоты по местам до отрисовки — никакого «прыжка» на кадр
  useLayoutEffect(() => {
    window.clearTimeout(timer.current);
    place(0, false);
  }, [periodKey, hasNext]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => place(0, false));
    observer.observe(el);
    return () => {
      observer.disconnect();
      window.clearTimeout(timer.current);
    };
  }, []);

  const settle = (dir: 1 | -1 | 0) => {
    const width = rootRef.current?.offsetWidth ?? 360;
    place(dir === 0 ? 0 : -dir * width * STEP, true);
    if (dir !== 0) timer.current = window.setTimeout(() => onShift(dir), SETTLE_MS);
  };

  const handlers = useDragX({
    onMove: (dx) => place(dx < 0 && !hasNext ? dx / 5 : dx, false),
    onRelease: (dx, velocity) => {
      const step = (rootRef.current?.offsetWidth ?? 360) * STEP;
      const flick = Math.abs(velocity) > 0.45;
      if (dx > 0 && (dx > step / 3 || flick)) settle(-1);
      else if (dx < 0 && (dx < -step / 3 || flick) && hasNext) settle(1);
      else settle(0);
    },
  });

  const slot = (key: 'prev' | 'current' | 'next', content: ReactNode) => (
    <div
      key={key}
      ref={(el) => {
        slots.current[key] = el;
      }}
      className={cn(styles.slot, key !== 'current' && styles.slotSide)}
      aria-hidden={key !== 'current'}
      onClick={key === 'prev' ? () => settle(-1) : key === 'next' ? () => settle(1) : undefined}
    >
      {content}
    </div>
  );

  return (
    <div ref={rootRef} className={styles.carousel} style={{ height }} {...handlers}>
      {slot('prev', prev)}
      {hasNext && slot('next', next)}
      {slot('current', current)}
    </div>
  );
}
