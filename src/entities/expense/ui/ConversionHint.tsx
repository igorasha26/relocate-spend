import { useEffect } from 'react';
import { CURRENCIES, type Currency } from '@/shared/config/currency';
import { useI18n } from '@/shared/i18n';
import { convert } from '@/shared/lib/money';
import { ensureRatesFor, getRatesFor, useLatestRates, type RateTable } from '@/shared/lib/rates';
import type { ISODate } from '@/shared/lib/date';
import styles from './ConversionHint.module.css';

interface Props {
  amount: number;
  currency: Currency;
  /** Дата покупки — курс берётся на неё. */
  date: ISODate;
  /** Курсы, зафиксированные у сохранённого расхода. Без них — курсы на дату покупки. */
  rates?: RateTable;
  /** Курс у старых расходов без rates. */
  eurRate?: number;
  /** Текст после сумм, например «курс на 10.11.2026». */
  suffix?: string;
}

/** «≈ 20,99 € · ≈ 22,67 $ · ≈ 1 984 ₽» — сумма во всех остальных валютах. */
export function ConversionHint({ amount, currency, date, rates, eurRate, suffix }: Props) {
  const { t, fmt } = useI18n();
  useLatestRates(); // пришли свежие курсы — подсказка пересчитается
  // Курс на выбранную дату траты: если его ещё нет на телефоне — загрузить
  useEffect(() => {
    if (!rates && !eurRate) void ensureRatesFor(date);
  }, [date, rates, eurRate]);
  if (amount <= 0) return null;
  const table = rates ?? (eurRate ? undefined : getRatesFor(date).rates);
  const others = CURRENCIES.filter((c) => c !== currency);
  return (
    <p className={styles.hint}>
      {others.map((c) => (
        <span key={c} className={styles.chip}>
          {t('common.approx', { amount: fmt.money(convert(amount, currency, c, table, eurRate), c) })}
        </span>
      ))}
      {suffix && <span className={styles.suffix}>{suffix}</span>}
    </p>
  );
}
