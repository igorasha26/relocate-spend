import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Icon, type IconName } from '../Icon';
import styles from './Button.module.css';

type Variant = 'primary' | 'secondary' | 'link' | 'danger-link' | 'danger-secondary';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: IconName;
  /** Растянуть на всю ширину (по умолчанию для primary/secondary). */
  block?: boolean;
  children: ReactNode;
}

export function Button({ variant = 'primary', icon, block, className, children, type = 'button', ...rest }: ButtonProps) {
  const isBlock = block ?? (variant === 'primary' || variant === 'secondary' || variant === 'danger-secondary');
  return (
    <button type={type} className={cn(styles.button, styles[variant], isBlock && styles.block, className)} {...rest}>
      {icon && <Icon name={icon} size={variant.includes('link') ? 20 : 22} />}
      <span>{children}</span>
    </button>
  );
}
