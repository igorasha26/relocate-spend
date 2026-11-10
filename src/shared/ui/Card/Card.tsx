import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import styles from './Card.module.css';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** muted — второстепенная карточка (подсказки), promo — тёмно-зелёная/акцентная. */
  tone?: 'default' | 'muted' | 'promo';
  padding?: 'none' | 'md' | 'lg';
  children: ReactNode;
}

export function Card({ tone = 'default', padding = 'md', className, children, ...rest }: CardProps) {
  return (
    <div className={cn(styles.card, styles[tone], styles[`pad-${padding}`], className)} {...rest}>
      {children}
    </div>
  );
}

/** Карточка-подсказка: жирный заголовок + серый текст. */
export function InfoCard({ title, text, className }: { title: string; text: string; className?: string }) {
  return (
    <Card tone="muted" className={className}>
      <p className={styles.infoTitle}>{title}</p>
      <p className={styles.infoText}>{text}</p>
    </Card>
  );
}
