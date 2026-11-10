import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState, useScanQuota } from '@/store';
import { APP_VERSION, FREE_SCAN_LIMIT, routes } from '@/shared/config/routes';
import { LANGUAGE_META, LANGUAGES, useI18n } from '@/shared/i18n';
import { today } from '@/shared/lib/date';
import { usePeriodLabels } from '@/features/period';
import { Icon, InfoCard, ListGroup, ListRow, Page, PageHeader, SectionLabel } from '@/shared/ui';
import { PreferenceSheets, type PreferenceSheet } from './PreferenceSheets';
import styles from './ProfilePage.module.css';

/** 06 · Профиль и настройки. */
export function ProfilePage() {
  const { t, fmt } = useI18n();
  const navigate = useNavigate();
  const labels = usePeriodLabels();
  const { settings, categories } = useAppState();
  const quota = useScanQuota(FREE_SCAN_LIMIT);
  const [sheet, setSheet] = useState<PreferenceSheet>(null);

  const now = today();
  const scans = quota.used;
  const progress = Math.min(scans / FREE_SCAN_LIMIT, 1);

  const themeLabel = {
    light: t('profile.themeLight'),
    dark: t('profile.themeDark'),
    system: t('profile.themeSystem'),
  }[settings.theme];

  return (
    <Page>
      <PageHeader title={t('profile.title')} />

      <section className={styles.account}>
        <span className={styles.accountIcon}>
          <Icon name="mail" size={22} />
        </span>
        <div className={styles.accountText}>
          <p className={styles.accountTitle}>{t('profile.localProfile')}</p>
          <p className={styles.accountSince}>{t('profile.since', { date: fmt.dayMonthYear(settings.createdAt) })}</p>
        </div>
        <p className={styles.saved}>
          <span className={styles.savedDot} aria-hidden />
          {t('profile.saved')}
        </p>
      </section>

      <section className={styles.plan}>
        <div className={styles.planText}>
          <p className={styles.planBadge}>{t('profile.free')}</p>
          <p className={styles.planTitle}>{t('profile.scans', { used: scans, limit: FREE_SCAN_LIMIT })}</p>
          <p className={styles.planHint}>{t('profile.scansHint', { month: labels.monthIn(now) })}</p>
          <div
            className={styles.progress}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={FREE_SCAN_LIMIT}
            aria-valuenow={scans}
            style={{ '--progress': `${progress * 100}%` } as CSSProperties}
          />
        </div>
        <button type="button" className={styles.planButton} onClick={() => navigate(routes.pro)}>
          {t('profile.wantPro')}
        </button>
      </section>

      <section>
        <SectionLabel>{t('profile.preferences')}</SectionLabel>
        <ListGroup>
          <ListRow
            leading={<Icon name="banknote" />}
            title={t('profile.baseCurrency')}
            value={settings.baseCurrency}
            chevron
            onClick={() => setSheet('currency')}
          />
          <ListRow
            leading={<Icon name="globe" />}
            title={t('profile.language')}
            value={LANGUAGE_META[settings.language].nativeName}
            chevron
            onClick={() => setSheet('language')}
          />
          <ListRow leading={<Icon name="moon" />} title={t('profile.theme')} value={themeLabel} chevron onClick={() => setSheet('theme')} />
          <ListRow
            leading={<Icon name="grid" />}
            title={t('profile.categories')}
            value={categories.length}
            chevron
            onClick={() => navigate(routes.categories)}
          />
        </ListGroup>
      </section>

      <InfoCard
        title={t('profile.languageCard')}
        text={LANGUAGES.map((code) => LANGUAGE_META[code].nativeName).join('  ·  ')}
      />

      <p className={styles.version}>{t('profile.version', { version: APP_VERSION })}</p>

      <PreferenceSheets open={sheet} onClose={() => setSheet(null)} />
    </Page>
  );
}
