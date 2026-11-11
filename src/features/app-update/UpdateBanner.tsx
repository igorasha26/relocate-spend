import { analytics } from '@/shared/analytics';
import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { useUpdateAvailable } from './updateCheck';
import styles from './UpdateBanner.module.css';

/** Плашка сверху: «Доступна новая версия · Обновить». */
export function UpdateBanner() {
  const { t } = useI18n();
  const available = useUpdateAvailable();
  if (!available) return null;
  return (
    <div className={styles.banner} role="status">
      <Icon name="sparkles" size={18} />
      <span className={styles.text}>{t('update.available')}</span>
      <button
        type="button"
        className={styles.button}
        onClick={() => {
          analytics.track('update_applied');
          window.location.reload();
        }}
      >
        {t('update.reload')}
      </button>
    </div>
  );
}
