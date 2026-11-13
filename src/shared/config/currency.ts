/**
 * Валюты приложения. Чтобы добавить новую — допишите код в CURRENCIES,
 * курс в FALLBACK_EUR_RATES и название в словари (currency.<CODE>).
 */
export const CURRENCIES = ['RSD', 'RUB', 'EUR', 'USD'] as const;

export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  RSD: 'RSD',
  RUB: '₽',
  EUR: '€',
  USD: '$',
};

/** Сколько единиц валюты стоит 1 EUR. */
export type EurRate = number;

/**
 * Запасная таблица курсов (1 EUR = N единиц валюты) — только когда нет ни сети, ни сохранённых курсов.
 * Живые курсы — shared/lib/rates.ts. Значения — примерно на ноябрь 2026.
 */
export const FALLBACK_EUR_RATES: Record<Currency, EurRate> = {
  EUR: 1,
  RSD: 117.2,
  USD: 1.12,
  RUB: 92.4,
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}
