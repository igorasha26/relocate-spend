import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib/cn';
import { Icon } from '@/shared/ui';
import type { CategoryColor, CategoryIcon } from '../model';
import styles from './CategoryIconTile.module.css';

interface Props {
  icon: CategoryIcon;
  color: CategoryColor;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/** Плитка с иконкой категории. Цвета берутся из токенов темы (--cat-c1…c8). */
export function CategoryIconTile({ icon, color, size = 'md', className }: Props) {
  const iconSize = size === 'sm' ? 18 : size === 'lg' ? 24 : 21;
  return (
    <span className={cn(styles.tile, styles[size], className)} style={{ '--cat': `var(--cat-${color})` } as CSSProperties}>
      <Icon name={icon} size={iconSize} />
    </span>
  );
}

/** Цветная точка категории (легенда диаграммы, список выбора). */
export function CategoryDot({ color, className }: { color: CategoryColor; className?: string }) {
  return <span className={cn(styles.dot, className)} style={{ background: `var(--cat-${color})` }} aria-hidden />;
}
