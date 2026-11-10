import { CURRENCIES, type Currency } from '@/shared/config/currency';
import { useI18n } from '@/shared/i18n';
import { convert, ratesService } from '@/shared/lib/money';
import type { ISODate } from '@/shared/lib/date';
import styles from './ConversionHint.module.css';

interface Props {
  amount: number;
  currency: Currency;
  /** Дата покупки — курс берётся на неё. */
  date: ISODate;
  /** Зафиксированный курс (у сохранённого расхода). Без него — курс на дату. */
  eurRate?: number;
  /** Текст после сумм, например «курс на 10.11.2026». */
  suffix?: string;
}

/** «≈ 20,99 € · ≈ 22,67 $ · ≈ 1 984 ₽» — сумма во всех остальных валютах. */
export function ConversionHint({ amount, currency, date, eurRate, suffix }: Props) {
  const { t, fmt } = useI18n();
  if (amount <= 0) return null;
  const rate = eurRate ?? ratesService.getEurRate(currency, date);
  const others = CURRENCIES.filter((c) => c !== currency);
  return (
    <p className={styles.hint}>
      {others.map((c) => (
        <span key={c} className={styles.chip}>
          {t('common.approx', { amount: fmt.money(convert(amount, rate, c), c) })}
        </span>
      ))}
      {suffix && <span className={styles.suffix}>{suffix}</span>}
    </p>
  );
}
