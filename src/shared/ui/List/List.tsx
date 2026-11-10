import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Icon } from '../Icon';
import styles from './List.module.css';

/** Сгруппированный список в стиле iOS (карточка с разделителями). */
export function ListGroup({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn(styles.group, className)}>{children}</div>;
}

/** Подпись над группой: «ПРЕДПОЧТЕНИЯ», «ПЕРИОД». */
export function SectionLabel({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className={styles.sectionLabel}>
      <span>{children}</span>
      {action}
    </div>
  );
}

interface ListRowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  value?: ReactNode;
  chevron?: boolean;
  onClick?: () => void;
  tone?: 'default' | 'accent' | 'danger';
}

export function ListRow({ leading, title, subtitle, value, chevron, onClick, tone = 'default' }: ListRowProps) {
  const content = (
    <>
      {leading && <span className={styles.leading}>{leading}</span>}
      <span className={styles.body}>
        <span className={styles.main}>
          <span className={cn(styles.title, styles[tone])}>{title}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </span>
        {value !== undefined && <span className={styles.value}>{value}</span>}
        {chevron && <Icon name="chevronRight" size={18} className={styles.chevron} />}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={cn(styles.row, styles.interactive)} onClick={onClick}>
        {content}
      </button>
    );
  }
  return <div className={styles.row}>{content}</div>;
}

/** Строка «ключ — значение» для экранов деталей. */
export function KeyValueRow({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div className={styles.kv}>
      <span className={styles.kvLabel}>{label}</span>
      <span className={styles.kvValue}>{value}</span>
    </div>
  );
}
