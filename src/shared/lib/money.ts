import { FALLBACK_EUR_RATES, type Currency, type EurRate } from '@/shared/config/currency';

/**
 * Сервис курсов. Сейчас возвращает фиксированную таблицу;
 * интерфейс уже асинхронный по смыслу (дата покупки), чтобы
 * позже подменить реализацию на сетевую без изменений в UI.
 */
export const ratesService = {
  /** Курс валюты к евро на указанную дату. */
  getEurRate(currency: Currency, _date?: string): EurRate {
    return FALLBACK_EUR_RATES[currency];
  },
};

/**
 * Перевод суммы между валютами.
 * `fromRate` — курс, зафиксированный в момент покупки (1 EUR = fromRate единиц).
 */
export function convert(amount: number, fromRate: EurRate, to: Currency): number {
  if (fromRate <= 0) return 0;
  return (amount / fromRate) * ratesService.getEurRate(to);
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
