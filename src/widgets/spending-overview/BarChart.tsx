import type { CSSProperties } from 'react';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { niceMax, type Bucket } from './buckets';
import styles from './SpendingOverview.module.css';

interface Props {
  buckets: Bucket[];
  highlight: number;
  selected: number;
  onSelect: (index: number) => void;
}

/** Столбчатый график «Динамика расходов» (макет 09). */
export function BarChart({ buckets, highlight, selected, onSelect }: Props) {
  const { fmt } = useI18n();
  const max = niceMax(Math.max(...buckets.map((b) => b.total), 0));
  const ticks = [max, max / 2, 0];

  return (
    <div className={styles.bars}>
      <div className={styles.grid} aria-hidden>
        {ticks.map((tick) => (
          <div key={tick} className={styles.gridLine}>
            <span>{tick === 0 ? '0' : fmt.compact(tick)}</span>
          </div>
        ))}
      </div>
      <div className={styles.columns} style={{ gridTemplateColumns: `repeat(${buckets.length}, 1fr)` }}>
        {buckets.map((bucket, index) => {
          const height = bucket.total > 0 ? Math.max((bucket.total / max) * 100, 4) : 0;
          return (
            <button
              key={bucket.start}
              type="button"
              className={cn(styles.column, index === selected && styles.columnSelected)}
              aria-label={`${bucket.label}: ${fmt.number(bucket.total, 0)}`}
              aria-pressed={index === selected}
              onClick={() => onSelect(index)}
            >
              <span className={styles.barTrack}>
                {height > 0 ? (
                  <span
                    className={cn(styles.bar, index === highlight ? styles.barCurrent : styles.barPast)}
                    style={{ height: `${height}%`, '--i': index } as CSSProperties}
                  />
                ) : (
                  <span className={styles.barEmpty} />
                )}
              </span>
              <span className={styles.barLabel}>{bucket.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
