import { useEffect, useState } from 'react';
import type { CategoryColor } from '@/entities/category';
import { cn } from '@/shared/lib/cn';
import styles from './SpendingOverview.module.css';

export interface DonutSlice {
  id: string;
  value: number;
  color: CategoryColor | 'muted';
  label: string;
}

interface Props {
  slices: DonutSlice[];
  /** Подпись в центре: «Ноябрь». */
  title: string;
  /** Вторая строка в центре: сумма. */
  caption: string;
  onSliceClick?: (id: string) => void;
  /** Соседний месяц в карусели: без процентов и кликов. */
  passive?: boolean;
  /** Анимация «вырастания» сегментов при первом показе. */
  animate?: boolean;
}

export const DONUT_SIZE = 264;
const C = DONUT_SIZE / 2;
const R = 84;
const STROKE = 26;
/** Зазор между сегментами (радианы). */
const GAP = 0.05;
const LABEL_R = R + STROKE / 2 + 18;
const TAU = Math.PI * 2;

const point = (angle: number, radius = R) => ({
  x: C + radius * Math.sin(angle),
  y: C - radius * Math.cos(angle),
});

function arcPath(from: number, to: number) {
  const a = point(from);
  const b = point(to);
  const large = to - from > Math.PI ? 1 : 0;
  return `M ${a.x} ${a.y} A ${R} ${R} 0 ${large} 1 ${b.x} ${b.y}`;
}

const colorOf = (s: DonutSlice) => (s.color === 'muted' ? 'var(--text-3)' : `var(--cat-${s.color})`);

/**
 * Кольцо трат: сегменты с ровными зазорами, проценты снаружи,
 * в центре — период и сумма. Без теней и фильтров — дёшево отрисовывается при листании.
 */
export function DonutChart({ slices, title, caption, onSliceClick, passive, animate = false }: Props) {
  const total = slices.reduce((s, x) => s + x.value, 0);

  // Сегменты «вырастают» из нуля при появлении (JS: атрибут d в Safari через CSS не анимируется)
  const [progress, setProgress] = useState(animate ? 0 : 1);
  useEffect(() => {
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setProgress(1);
      return;
    }
    const started = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min((now - started) / 700, 1);
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate]);

  let acc = 0;
  const arcs = slices.map((slice) => {
    const share = total > 0 ? slice.value / total : 0;
    const start = acc * TAU * progress;
    acc += share;
    return { slice, share, start, end: acc * TAU * progress };
  });
  const gap = arcs.length > 1 ? GAP : 0;
  const clickable = Boolean(onSliceClick) && !passive;

  return (
    <div className={cn(styles.donut, passive && styles.donutPassive)}>
      <svg width={DONUT_SIZE} height={DONUT_SIZE} viewBox={`0 0 ${DONUT_SIZE} ${DONUT_SIZE}`} role="img" aria-label={`${title} ${caption}`}>
        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} />
        {total > 0 &&
          arcs.map((a) =>
            arcs.length === 1 ? (
              <circle key={a.slice.id} cx={C} cy={C} r={R} fill="none" stroke={colorOf(a.slice)} strokeWidth={STROKE} />
            ) : (
              <path
                key={a.slice.id}
                d={arcPath(a.start + gap / 2, Math.max(a.end - gap / 2, a.start + gap / 2 + 0.012))}
                fill="none"
                stroke={colorOf(a.slice)}
                strokeWidth={STROKE}
                className={clickable ? styles.slice : undefined}
                onClick={clickable ? () => onSliceClick?.(a.slice.id) : undefined}
              >
                <title>{`${a.slice.label} · ${Math.round(a.share * 100)}%`}</title>
              </path>
            ),
          )}

        {/* Проценты снаружи кольца (у долей от 2%, чтобы подписи не слипались) */}
        {total > 0 &&
          progress === 1 &&
          arcs.map((a) => {
            const pct = Math.round(a.share * 100);
            if (pct < 2) return null;
            const mid = (a.start + a.end) / 2;
            const p = point(mid, LABEL_R);
            const sin = Math.sin(mid);
            return (
              <text
                key={`pct-${a.slice.id}`}
                x={p.x}
                y={p.y}
                className={styles.pct}
                textAnchor={sin > 0.35 ? 'start' : sin < -0.35 ? 'end' : 'middle'}
                dominantBaseline="middle"
              >
                {pct}%
              </text>
            );
          })}
      </svg>
      <div className={styles.donutCenter} aria-hidden>
        <span className={styles.donutCaption}>{title}</span>
        <span className={styles.donutTitle}>{caption}</span>
      </div>
    </div>
  );
}
