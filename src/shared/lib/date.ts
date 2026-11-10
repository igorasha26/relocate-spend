/**
 * Работа с датами без часовых поясов.
 *
 * Все даты расходов хранятся как строка `YYYY-MM-DD` (ISODate).
 * `new Date('2026-11-09')` парсится как UTC и в западных часовых поясах
 * превращается в 8 ноября — поэтому здесь всё строится через локальный конструктор.
 */

/** Календарная дата в формате `YYYY-MM-DD`. */
export type ISODate = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseISODate(value: ISODate): Date {
  const [y = 1970, m = 1, d = 1] = value.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isISODate(value: unknown): value is ISODate {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export function today(): ISODate {
  return toISODate(new Date());
}

export function nowTime(): string {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function addDays(date: ISODate, days: number): ISODate {
  const d = parseISODate(date);
  d.setDate(d.getDate() + days);
  return toISODate(d);
}

export function addMonths(date: ISODate, months: number): ISODate {
  const d = parseISODate(date);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  d.setDate(Math.min(day, daysInMonth(d.getFullYear(), d.getMonth())));
  return toISODate(d);
}

export function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export function startOfMonth(date: ISODate): ISODate {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: ISODate): ISODate {
  const d = parseISODate(date);
  return toISODate(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

/** Неделя начинается с понедельника. */
export function startOfWeek(date: ISODate): ISODate {
  const d = parseISODate(date);
  const shift = (d.getDay() + 6) % 7;
  return addDays(date, -shift);
}

export function startOfYear(date: ISODate): ISODate {
  return `${date.slice(0, 4)}-01-01`;
}

export function endOfYear(date: ISODate): ISODate {
  return `${date.slice(0, 4)}-12-31`;
}

/** Количество дней между датами включительно. */
export function daysBetweenInclusive(start: ISODate, end: ISODate): number {
  const ms = parseISODate(end).getTime() - parseISODate(start).getTime();
  return Math.round(ms / 86_400_000) + 1;
}

export function isWithin(date: ISODate, start: ISODate, end: ISODate): boolean {
  return date >= start && date <= end;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a < b ? a : b;
}

export function maxDate(a: ISODate, b: ISODate): ISODate {
  return a > b ? a : b;
}

/** Сетка месяца для календаря: недели по 7 ячеек, пустые ячейки = null. */
export function monthGrid(year: number, monthIndex: number): (ISODate | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const leading = (first.getDay() + 6) % 7;
  const total = daysInMonth(year, monthIndex);
  const cells: (ISODate | null)[] = Array.from({ length: leading }, () => null);
  for (let day = 1; day <= total; day++) {
    cells.push(toISODate(new Date(year, monthIndex, day)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (ISODate | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}
