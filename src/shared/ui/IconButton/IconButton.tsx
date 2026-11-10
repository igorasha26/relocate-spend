import type { ButtonHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { Icon, type IconName } from '../Icon';
import styles from './IconButton.module.css';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: IconName;
  /** Обязательная подпись — у кнопки без текста должна быть доступная метка. */
  label: string;
  /** plain — просто иконка, tile — квадратная плитка, close — круглая кнопка «×» в шторках. */
  variant?: 'plain' | 'tile' | 'close';
  active?: boolean;
  size?: number;
}

export function IconButton({ icon, label, variant = 'plain', active, size, className, type = 'button', ...rest }: IconButtonProps) {
  const iconSize = size ?? (variant === 'close' ? 16 : 22);
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(styles.button, styles[variant], active && styles.active, className)}
      {...rest}
    >
      <Icon name={icon} size={iconSize} strokeWidth={variant === 'close' ? 2.4 : 1.9} />
    </button>
  );
}
