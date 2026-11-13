import { useI18n } from '@/shared/i18n';
import { RATES_SOURCE, useLatestRates } from '@/shared/lib/rates';
import styles from './ProfilePage.module.css';

/** «Курсы валют на 13 ноября 2026 · 1 EUR = 117,2 RSD · источник» — источник обязателен по условиям API. */
export function RatesNote() {
  const { t, fmt } = useI18n();
  const { rates, date } = useLatestRates();
  return (
    <p className={styles.ratesNote}>
      {date ? t('profile.ratesOn', { date: fmt.dayMonthYear(date) }) : t('profile.ratesOffline')}
      {` · 1 EUR = ${fmt.number(rates.RSD, 2)} RSD · ${fmt.number(rates.RUB, 2)} ₽ · ${fmt.number(rates.USD, 2)} $`}
      <br />
      <a href={RATES_SOURCE.url} target="_blank" rel="noreferrer">
        Rates by {RATES_SOURCE.name}
      </a>
    </p>
  );
}
