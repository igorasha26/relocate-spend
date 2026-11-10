import {
  addDays,
  addMonths,
  daysBetweenInclusive,
  endOfMonth,
  endOfYear,
  parseISODate,
  startOfMonth,
  startOfWeek,
  startOfYear,
  today,
  type ISODate,
} from '@/shared/lib/date';

export type PeriodKind = 'week' | 'month' | 'year' | 'custom';

export interface Period {
  kind: PeriodKind;
  start: ISODate;
  end: ISODate;
  /**
   * Опорная дата — «где пользователь сейчас смотрит».
   * Сохраняется при переключении Неделя/Месяц/Год, поэтому
   * «Месяц → Неделя → Месяц» возвращает тот же месяц, а не соседний.
   */
  anchor?: ISODate;
}

/** Опорная дата: сегодня, если оно в периоде; иначе прежняя опора, если она в периоде; иначе начало. */
function resolveAnchor(start: ISODate, end: ISODate, preferred?: ISODate): ISODate {
  const now = today();
  if (now >= start && now <= end) return now;
  if (preferred && preferred >= start && preferred <= end) return preferred;
  return start;
}

/** Период заданного типа, содержащий дату `anchor`. */
export function periodFor(kind: Exclude<PeriodKind, 'custom'>, anchor: ISODate = today()): Period {
  let start: ISODate;
  let end: ISODate;
  switch (kind) {
    case 'week':
      start = startOfWeek(anchor);
      end = addDays(start, 6);
      break;
    case 'month':
      start = startOfMonth(anchor);
      end = endOfMonth(anchor);
      break;
    case 'year':
      start = startOfYear(anchor);
      end = endOfYear(anchor);
      break;
  }
  return { kind, start, end, anchor: resolveAnchor(start, end, anchor) };
}

export function customPeriod(start: ISODate, end: ISODate): Period {
  const [s, e] = start <= end ? [start, end] : [end, start];
  return { kind: 'custom', start: s, end: e, anchor: resolveAnchor(s, e) };
}

/** Опорная дата периода (у старых сохранённых периодов её может не быть). */
export function anchorOf(period: Period): ISODate {
  return period.anchor ?? resolveAnchor(period.start, period.end);
}

/** Переключение Неделя/Месяц/Год без «уплывания» в соседний месяц. */
export function switchKind(period: Period, kind: Exclude<PeriodKind, 'custom'>): Period {
  return periodFor(kind, anchorOf(period));
}

/** Соседний период: dir = -1 — назад, 1 — вперёд. */
export function shiftPeriod(period: Period, dir: 1 | -1): Period {
  const anchor = anchorOf(period);
  switch (period.kind) {
    case 'week':
      return periodFor('week', addDays(anchor, 7 * dir));
    case 'month':
      return periodFor('month', addMonths(anchor, dir));
    case 'year':
      return periodFor('year', addMonths(anchor, 12 * dir));
    case 'custom': {
      const length = daysBetweenInclusive(period.start, period.end);
      return customPeriod(addDays(period.start, length * dir), addDays(period.end, length * dir));
    }
  }
}

/** Предыдущий период такой же продолжительности — для сравнения «на 12% меньше». */
export function previousPeriod(period: Period): Period {
  return shiftPeriod(period, -1);
}

export function containsToday(period: Period): boolean {
  const now = today();
  return now >= period.start && now <= period.end;
}

export function isFuture(period: Period): boolean {
  return period.start > today();
}

export function monthIndexOf(date: ISODate): number {
  return parseISODate(date).getMonth();
}
