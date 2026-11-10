import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import styles from './Page.module.css';

/** Обёртка экрана: отступы и вертикальный ритм секций. */
export function Page({ children, className, gap = 'md' }: { children: ReactNode; className?: string; gap?: 'sm' | 'md' | 'lg' }) {
  return <div className={cn(styles.page, styles[gap], className)}>{children}</div>;
}
