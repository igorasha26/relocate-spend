import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Icon, type IconName } from '../Icon';
import styles from './Notice.module.css';

interface NoticeProps {
  tone: 'warning' | 'success';
  title: ReactNode;
  text?: ReactNode;
  icon?: IconName;
  className?: string;
}

/** Цветная плашка-статус: «Нет подключения», «Чек успешно считан». */
export function Notice({ tone, title, text, icon, className }: NoticeProps) {
  return (
    <div role="status" className={cn(styles.notice, styles[tone], className)}>
      {icon && <Icon name={icon} size={22} strokeWidth={2} className={styles.icon} />}
      <div>
        <p className={styles.title}>{title}</p>
        {text && <p className={styles.text}>{text}</p>}
      </div>
    </div>
  );
}
