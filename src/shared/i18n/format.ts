import type { Currency } from '@/shared/config/currency';
import { CURRENCY_SYMBOL } from '@/shared/config/currency';
import { parseISODate, type ISODate } from '@/shared/lib/date';

const capitalize = (s: string) => (s ? s[0]!.toLocaleUpperCase() + s.slice(1) : s);

/**
 * Все форматтеры для конкретной локали.
 * Создаются один раз на язык (Intl-объекты дорогие).
 */
export function createFormatters(locale: string) {
  const number0 = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const number2 = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  const fixed2 = new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const compact = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
  const monthLong = new Intl.DateTimeFormat(locale, { month: 'long' });
  const monthShort = new Intl.DateTimeFormat(locale, { month: 'short' });
  const dayMonth = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' });
  const dayMonthShort = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const weekday = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  const numeric = new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  /** Достаёт только нужные части даты, без «г.» и прочего мусора. */
  const pick = (fmt: Intl.DateTimeFormat, date: Date, types: Intl.DateTimeFormatPartTypes[]) =>
    fmt
      .formatToParts(date)
      .filter((p) => types.includes(p.type))
      .map((p) => p.value)
      .join(' ');

  const formatters = {
    locale,

    /** 128 460 / 20,99 */
    number(value: number, fractionDigits: 0 | 2 | 'auto' = 'auto') {
      if (fractionDigits === 0) return number0.format(value);
      if (fractionDigits === 2) return fixed2.format(value);
      return Math.abs(value) >= 1000 ? number0.format(value) : number2.format(value);
    },

    /** Знак валюты рядом с крупной суммой: ₽ € $ дин. */
    currencySign(currency: Currency) {
      if (currency === 'RSD') return locale.startsWith('ru') ? 'дин.' : 'din.';
      return CURRENCY_SYMBOL[currency];
    },

    /** 90 тыс. — подписи осей графика */
    compact(value: number) {
      return compact.format(value);
    },

    /** 2 460 RSD · 20,99 € */
    money(value: number, currency: Currency) {
      const digits = currency === 'RSD' || currency === 'RUB' ? 0 : 2;
      const amount = digits === 0 ? number0.format(Math.round(value)) : fixed2.format(value);
      return `${amount} ${CURRENCY_SYMBOL[currency]}`;
    },

    /** Ноябрь 2026 */
    monthYear(date: ISODate) {
      const d = parseISODate(date);
      return `${capitalize(monthLong.format(d))} ${d.getFullYear()}`;
    },

    /** Ноябрь */
    monthName(monthIndex: number) {
      return capitalize(monthLong.format(new Date(2000, monthIndex, 1)));
    },

    /** нояб. */
    monthShort(monthIndex: number) {
      return monthShort.format(new Date(2000, monthIndex, 1)).replace('.', '');
    },

    /** ноября — родительный падеж (для «Расходы ноября») */
    monthGenitive(date: ISODate) {
      return pick(dayMonth, parseISODate(date), ['month']);
    },

    /** 9 ноября */
    dayMonth(date: ISODate) {
      return pick(dayMonth, parseISODate(date), ['day', 'month']);
    },

    /** 9 ноября 2026 */
    dayMonthYear(date: ISODate) {
      const d = parseISODate(date);
      return `${pick(dayMonth, d, ['day', 'month'])} ${d.getFullYear()}`;
    },

    /** 2 нояб. 2026 */
    dayMonthShortYear(date: ISODate) {
      const d = parseISODate(date);
      return `${pick(dayMonthShort, d, ['day', 'month'])} ${d.getFullYear()}`;
    },

    /** 09.11.2026 */
    numericDate(date: ISODate) {
      return numeric.format(parseISODate(date));
    },

    /** 2–9 ноября · 28 окт. – 3 нояб. */
    range(start: ISODate, end: ISODate) {
      const s = parseISODate(start);
      const e = parseISODate(end);
      if (start === end) return pick(dayMonth, s, ['day', 'month']);
      if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
        return `${s.getDate()}–${pick(dayMonth, e, ['day', 'month'])}`;
      }
      const sameYear = s.getFullYear() === e.getFullYear();
      const left = pick(dayMonthShort, s, ['day', 'month']);
      const right = pick(dayMonthShort, e, ['day', 'month']);
      return sameYear ? `${left} – ${right}` : `${left} ${s.getFullYear()} – ${right} ${e.getFullYear()}`;
    },

    /** Пн, Вт … (неделя с понедельника) */
    weekdaysShort() {
      // 2024-01-01 — понедельник
      return Array.from({ length: 7 }, (_, i) => weekday.format(new Date(2024, 0, 1 + i)).replace('.', ''));
    },
  };

  return formatters;
}

export type Formatters = ReturnType<typeof createFormatters>;
