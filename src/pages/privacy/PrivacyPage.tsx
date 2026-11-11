import { useNavigate } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import { Page, PageHeader } from '@/shared/ui';
import { PRIVACY, PRIVACY_UPDATED } from './content';
import styles from './PrivacyPage.module.css';

/** Политика конфиденциальности — на языке интерфейса. */
export function PrivacyPage() {
  const { t, language } = useI18n();
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader
        title={t('privacy.title')}
        onBack={() => (window.history.length > 1 ? navigate(-1) : navigate(routes.profile))}
      />
      <article className={styles.article}>
        {PRIVACY[language].map((section) => (
          <section key={section.title} className={styles.section}>
            <h2 className={styles.title}>{section.title}</h2>
            {section.text.map((p) => (
              <p key={p.slice(0, 32)} className={styles.text}>
                {p}
              </p>
            ))}
          </section>
        ))}
        <p className={styles.updated}>{PRIVACY_UPDATED[language]}</p>
      </article>
    </Page>
  );
}
