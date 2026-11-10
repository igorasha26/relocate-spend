import { useId, type ReactNode } from 'react';
import type { Currency } from '@/shared/config/currency';
import { cn } from '@/shared/lib/cn';
import { groupAmountInput, sanitizeAmountInput } from '@/shared/lib/money';
import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import styles from './AmountCard.module.css';

interface Props {
  label: string;
  value: string;
  currency: Currency;
  onChange: (value: string) => void;
  onCurrencyClick: () => void;
  currencyLabel: string;
  hint?: ReactNode;
  autoFocus?: boolean;
  invalid?: boolean;
  /** Сумма считается автоматически (по позициям) — поле только для чтения. */
  readOnly?: boolean;
  /** Метка рядом с подписью, например «по позициям». */
  badge?: string;
}

/** Крупная сумма + кнопка валюты (макет 02 / UI 11 / UI 12). */
export function AmountCard({ label, value, currency, onChange, onCurrencyClick, currencyLabel, hint, autoFocus, invalid, readOnly, badge }: Props) {
  const id = useId();
  const { fmt } = useI18n();
  const display = groupAmountInput(value);
  return (
    <div className={styles.wrap}>
      <div className={cn(styles.card, invalid && styles.invalid, readOnly && styles.readOnly)}>
        <label htmlFor={id} className={styles.label}>
          {label}
          {badge && <span className={styles.badge}>{badge}</span>}
        </label>
        <div className={styles.row}>
          {/* Поле растягивается по содержимому, чтобы знак валюты стоял сразу за числом */}
          <label
            htmlFor={id}
            className={styles.amountWrap}
            // Длинная сумма уменьшается, чтобы не заезжать на кнопку валюты
            style={{ fontSize: display.length > 11 ? 24 : display.length > 8 ? 30 : undefined }}
          >
            {/* Ширину задаёт невидимый текст, поле наложено поверх — знак валюты стоит сразу за числом */}
            <span className={styles.field}>
              <span className={styles.sizer} aria-hidden>
                {display || '0'}
              </span>
              <input
                id={id}
                className={styles.input}
                size={1}
                inputMode="decimal"
                autoComplete="off"
                placeholder="0"
                value={display}
                autoFocus={autoFocus && !readOnly}
                readOnly={readOnly}
                aria-invalid={invalid || undefined}
                onChange={(e) => onChange(sanitizeAmountInput(e.target.value))}
              />
            </span>
            <span className={styles.sign}>{fmt.currencySign(currency)}</span>
          </label>
          <button type="button" className={styles.currency} onClick={onCurrencyClick} aria-label={currencyLabel}>
            {currency}
            <Icon name="chevronDown" size={16} strokeWidth={2.2} />
          </button>
        </div>
      </div>
      {hint}
    </div>
  );
}
