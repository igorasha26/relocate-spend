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
 * Запасная таблица курсов (1 EUR = N единиц валюты).
 * TODO: подключить реальный источник курсов на дату покупки
 * (например, API Народного банка Сербии) через `ratesService`.
 */
export const FALLBACK_EUR_RATES: Record<Currency, EurRate> = {
  EUR: 1,
  RSD: 117.2,
  USD: 1.08,
  RUB: 94.5,
};

export function isCurrency(value: unknown): value is Currency {
  return typeof value === 'string' && (CURRENCIES as readonly string[]).includes(value);
}
