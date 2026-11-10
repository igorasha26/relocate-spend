import { useNavigate } from 'react-router-dom';
import { FREE_SCAN_LIMIT } from '@/shared/config/routes';
import { useI18n, type TranslationKey } from '@/shared/i18n';
import { Button, Icon, InfoCard, Page, PageHeader, useToast, type IconName } from '@/shared/ui';
import styles from './ProPage.module.css';

const FEATURES: { icon: IconName; title: TranslationKey; text: TranslationKey }[] = [
  { icon: 'scan', title: 'pro.f1Title', text: 'pro.f1Text' },
  { icon: 'chart', title: 'pro.f2Title', text: 'pro.f2Text' },
  { icon: 'upload', title: 'pro.f3Title', text: 'pro.f3Text' },
  { icon: 'cloud', title: 'pro.f4Title', text: 'pro.f4Text' },
];

/** 08 · RelocateSpend Pro. Оплаты пока нет — кнопка честно говорит «скоро». */
export function ProPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();

  return (
    <Page>
      <PageHeader title={t('pro.title')} onBack={() => navigate(-1)} />

      <section className={styles.hero}>
        <span className={styles.badge}>{t('pro.badge')}</span>
        <h2 className={styles.heroTitle}>{t('pro.heroTitle')}</h2>
        <p className={styles.heroText}>{t('pro.heroText')}</p>
      </section>

      <ul className={styles.features}>
        {FEATURES.map((f) => (
          <li key={f.title} className={styles.feature}>
            <span className={styles.featureIcon}>
              <Icon name={f.icon} size={20} />
            </span>
            <div>
              <p className={styles.featureTitle}>{t(f.title)}</p>
              <p className={styles.featureText}>{t(f.text)}</p>
            </div>
          </li>
        ))}
      </ul>

      <InfoCard title={t('pro.currentTitle')} text={t('pro.currentText', { limit: FREE_SCAN_LIMIT })} />

      <p className={styles.terms}>{t('pro.terms')}</p>
      <Button onClick={() => toast(t('pro.soon'))}>{t('pro.cta')}</Button>
    </Page>
  );
}
