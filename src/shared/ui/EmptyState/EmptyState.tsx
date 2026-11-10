import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Icon, type IconName } from '../Icon';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon: IconName;
  title: string;
  text?: string;
  tone?: 'accent' | 'warning';
  actions?: ReactNode;
  footnote?: ReactNode;
}

/** Пустые и ошибочные состояния экрана: плитка-иконка, заголовок, текст, кнопки. */
export function EmptyState({ icon, title, text, tone = 'accent', actions, footnote }: EmptyStateProps) {
  return (
    <section className={styles.root}>
      <div className={cn(styles.tile, styles[tone])}>
        <Icon name={icon} size={44} strokeWidth={1.4} />
      </div>
      <h2 className={styles.title}>{title}</h2>
      {text && <p className={styles.text}>{text}</p>}
      {actions && <div className={styles.actions}>{actions}</div>}
      {footnote && <p className={styles.footnote}>{footnote}</p>}
    </section>
  );
}
