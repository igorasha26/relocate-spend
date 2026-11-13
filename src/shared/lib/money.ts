import type { Currency, EurRate } from '@/shared/config/currency';
import type { ISODate } from '@/shared/lib/date';
import { convertWith, getRatesFor, type RateTable } from './rates';

/** Курсы на дату покупки (из сохранённой истории, иначе свежие или встроенные). */
export const ratesService = {
  /** Курс валюты к евро на указанную дату. */
  getEurRate(currency: Currency, date?: ISODate): EurRate {
    return getRatesFor(date).rates[currency];
  },
};

/**
 * Перевод суммы между любыми валютами.
 * rates — таблица, зафиксированная при покупке (у новых трат). У старых трат её нет:
 * тогда курс исходной валюты — fromRate (сохранённый при покупке), остальные — текущие.
 */
export function convert(amount: number, from: Currency, to: Currency, rates?: RateTable, fromRate?: EurRate): number {
  if (from === to) return amount;
  const table = rates ?? { ...getRatesFor().rates, ...(fromRate ? { [from]: fromRate } : {}) };
  return convertWith(amount, from, to, table);
}

/** Валюта для подсказки «≈ …» рядом с суммой. */
export function hintCurrency(currency: Currency, base: Currency): Currency {
  if (currency !== 'EUR') return 'EUR';
  return base !== 'EUR' ? base : 'USD';
}

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Разбор пользовательского ввода суммы: «2 460,50» → 2460.5. */
export function parseAmount(input: string): number {
  const normalized = input.replace(/\s/g, '').replace(',', '.');
  const value = Number.parseFloat(normalized);
  return Number.isFinite(value) && value > 0 ? roundMoney(value) : 0;
}

/** «2460,5» → «2 460,5» — для отображения в поле ввода (пробел неразрывный). */
export function groupAmountInput(value: string): string {
  const [int = '', fraction] = value.split(',');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  return fraction === undefined ? grouped : `${grouped},${fraction}`;
}

/** Оставляет только цифры и один десятичный разделитель (макс. 2 знака). */
export function sanitizeAmountInput(input: string): string {
  let result = input.replace(/[^\d.,]/g, '').replace('.', ',');
  const [int = '', ...rest] = result.split(',');
  const intPart = int.replace(/^0+(?=\d)/, '').slice(0, 10);
  if (rest.length === 0) return intPart;
  result = `${intPart || '0'},${rest.join('').slice(0, 2)}`;
  return result;
}
