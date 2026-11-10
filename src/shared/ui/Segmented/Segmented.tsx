import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import styles from './Segmented.module.css';

interface Option<T extends string> {
  value: T;
  label: ReactNode;
  /** Подпись для иконочных сегментов. */
  ariaLabel?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
  /** compact — маленький переключатель с иконками (диаграмма/столбцы). */
  size?: 'md' | 'compact';
  ariaLabel?: string;
  className?: string;
}

export function Segmented<T extends string>({ value, options, onChange, size = 'md', ariaLabel, className }: SegmentedProps<T>) {
  const index = options.findIndex((o) => o.value === value);
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={cn(styles.root, styles[size], className)}
      style={{ '--count': options.length, '--index': Math.max(index, 0) } as CSSProperties}
    >
      {/* Плашка выбранного сегмента плавно переезжает, а не перескакивает */}
      {index >= 0 && <span className={styles.thumb} aria-hidden />}
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={option.ariaLabel}
            title={option.ariaLabel}
            className={cn(styles.segment, selected && styles.selected)}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
