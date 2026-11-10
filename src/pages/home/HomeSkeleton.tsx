import { useI18n } from '@/shared/i18n';
import { Skeleton } from '@/shared/ui';
import styles from './HomePage.module.css';

/** 13 · Загрузка. */
export function HomeSkeleton() {
  const { t } = useI18n();
  return (
    <div className={styles.skeleton} aria-busy="true">
      <Skeleton height={38} radius={12} />
      <div className={styles.skeletonStack}>
        <Skeleton width="38%" height={12} />
        <Skeleton width="70%" height={42} radius={12} />
        <Skeleton width="60%" height={12} />
      </div>
      <div className={styles.skeletonCard}>
        <Skeleton width="45%" height={14} />
        <div className={styles.skeletonPie}>
          <Skeleton circle width={146} height={146} />
          <div className={styles.skeletonLegend}>
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={styles.skeletonStack}>
                <Skeleton height={8} />
                <Skeleton width="60%" height={8} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className={styles.skeletonRow}>
          <Skeleton width={42} height={42} radius={12} />
          <div className={styles.skeletonStack}>
            <Skeleton width="80%" height={12} />
            <Skeleton width="45%" height={8} />
          </div>
          <Skeleton width={80} height={12} />
        </div>
      ))}
      <p className={styles.skeletonText}>{t('home.loading')}</p>
    </div>
  );
}
