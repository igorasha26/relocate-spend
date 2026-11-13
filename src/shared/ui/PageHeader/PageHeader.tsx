import type { ReactNode } from 'react';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Icon } from '../Icon';
import styles from './PageHeader.module.css';

interface PageHeaderProps {
  title: string;
  /** Показать «‹ Назад». */
  onBack?: () => void;
  /** Главный экран: в светлой теме вместо заголовка показывается название приложения. */
  brand?: boolean;
  trailing?: ReactNode;
  className?: string;
}

/**
 * Шапка экрана. Разметка одна, а вид зависит от темы (как в макете):
 * тёмная — iOS Large Title с подписью сверху, светлая — компактная строка.
 */
export function PageHeader({ title, onBack, brand, trailing, className }: PageHeaderProps) {
  const { t } = useI18n();
  return (
    <header className={cn(styles.header, brand && styles.brand, onBack && styles.withBack, className)}>
      <div className={styles.top}>
        {onBack ? (
          <button type="button" className={styles.back} onClick={onBack} aria-label={t('common.back')}>
            <Icon name="chevronLeft" size={22} strokeWidth={2.2} />
            <span className={styles.backText}>{t('common.back')}</span>
          </button>
        ) : (
          <span className={styles.eyebrow}>{t('common.appName')}</span>
        )}
      </div>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>
          <span className={styles.titleMain}>{title}</span>
          {brand && (
            <span className={styles.titleBrand} aria-hidden>
              {t('common.appName')}
            </span>
          )}
        </h1>
        {trailing}
      </div>
    </header>
  );
}

/** Метка справа в шапке: «Сербия». */
export function HeaderTag({ children }: { children: ReactNode }) {
  return <span className={styles.tag}>{children}</span>;
}

/** Метка «TEST» в шапке тестовой сборки — чтобы не перепутать с основной версией. */
export function EnvBadge({ label }: { label: string }) {
  return <span className={styles.envBadge}>{label}</span>;
}
