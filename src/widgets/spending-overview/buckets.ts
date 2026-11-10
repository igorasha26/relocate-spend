import { amountIn, type Expense } from '@/entities/expense';
import type { Period } from '@/features/period';
import type { Currency } from '@/shared/config/currency';
import type { Formatters } from '@/shared/i18n/format';
import { addDays, daysBetweenInclusive, endOfMonth, minDate, parseISODate, today, toISODate, type ISODate } from '@/shared/lib/date';

export interface Bucket {
  start: ISODate;
  end: ISODate;
  label: string;
  total: number;
}

function chunks(start: ISODate, end: ISODate, size: number): { start: ISODate; end: ISODate }[] {
  const result: { start: ISODate; end: ISODate }[] = [];
  for (let s = start; s <= end; s = addDays(s, size)) {
    result.push({ start: s, end: minDate(addDays(s, size - 1), end) });
  }
  return result;
}

/** Делит период на столбцы графика «Динамика расходов». */
export function buildBuckets(period: Period, expenses: readonly Expense[], currency: Currency, fmt: Formatters): Bucket[] {
  let ranges: { start: ISODate; end: ISODate; label: string }[];

  if (period.kind === 'year') {
    const year = parseISODate(period.start).getFullYear();
    ranges = Array.from({ length: 12 }, (_, m) => {
      const start = toISODate(new Date(year, m, 1));
      return { start, end: endOfMonth(start), label: fmt.monthShort(m) };
    });
  } else if (period.kind === 'week' || daysBetweenInclusive(period.start, period.end) <= 14) {
    const weekdays = fmt.weekdaysShort();
    ranges = chunks(period.start, period.end, 1).map((r) => ({
      ...r,
      label: period.kind === 'week' ? weekdays[(parseISODate(r.start).getDay() + 6) % 7]! : String(parseISODate(r.start).getDate()),
    }));
  } else {
    ranges = chunks(period.start, period.end, 7).map((r) => ({
      ...r,
      label: `${parseISODate(r.start).getDate()}–${parseISODate(r.end).getDate()}`,
    }));
  }

  return ranges.map((r) => ({
    ...r,
    total: expenses
      .filter((e) => e.date >= r.start && e.date <= r.end)
      .reduce((sum, e) => sum + amountIn(e, currency), 0),
  }));
}

/** Индекс столбца с сегодняшним днём (или -1). */
export function currentBucketIndex(buckets: Bucket[]): number {
  const now = today();
  return buckets.findIndex((b) => now >= b.start && now <= b.end);
}

/** «Красивый» максимум оси с шагом в половину порядка: 82 000 → 85 000, 101 000 → 150 000. */
export function niceMax(value: number): number {
  if (value <= 0) return 1;
  const step = 10 ** Math.floor(Math.log10(value)) / 2;
  return Math.ceil(value / step) * step;
}
