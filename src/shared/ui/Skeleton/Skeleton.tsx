import type { CSSProperties } from 'react';
import { cn } from '@/shared/lib/cn';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  width?: CSSProperties['width'];
  height?: CSSProperties['height'];
  radius?: CSSProperties['borderRadius'];
  circle?: boolean;
  className?: string;
}

export function Skeleton({ width = '100%', height = 14, radius = 8, circle, className }: SkeletonProps) {
  return (
    <span
      aria-hidden
      className={cn(styles.skeleton, circle && styles.circle, className)}
      style={{ width, height, borderRadius: circle ? '50%' : radius }}
    />
  );
}
