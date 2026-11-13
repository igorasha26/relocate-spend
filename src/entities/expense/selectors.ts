import type { Currency } from '@/shared/config/currency';
import { convert } from '@/shared/lib/money';
import { isWithin, type ISODate } from '@/shared/lib/date';
import type { Expense, ExpenseSource } from './model';

/** Сумма расхода в валюте отображения. */
export function amountIn(expense: Expense, currency: Currency): number {
  if (expense.currency === currency) return expense.amount;
  return convert(expense.amount, expense.currency, currency, expense.rates, expense.eurRate);
}

export function sumIn(expenses: readonly Expense[], currency: Currency): number {
  return expenses.reduce((total, e) => total + amountIn(e, currency), 0);
}

export function inRange(expenses: readonly Expense[], start: ISODate, end: ISODate): Expense[] {
  return expenses.filter((e) => isWithin(e.date, start, end));
}

/** Новые сверху: по дате, затем по времени, затем по моменту создания. */
export function sortByDateDesc(expenses: readonly Expense[]): Expense[] {
  return [...expenses].sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      (b.time ?? '').localeCompare(a.time ?? '') ||
      b.createdAt.localeCompare(a.createdAt),
  );
}

export interface DayGroup {
  date: ISODate;
  expenses: Expense[];
}

export function groupByDay(expenses: readonly Expense[]): DayGroup[] {
  const groups = new Map<ISODate, Expense[]>();
  for (const e of sortByDateDesc(expenses)) {
    const list = groups.get(e.date);
    if (list) list.push(e);
    else groups.set(e.date, [e]);
  }
  return [...groups].map(([date, list]) => ({ date, expenses: list }));
}

export interface CategoryTotal {
  categoryId: string;
  total: number;
  count: number;
}

export function totalsByCategory(expenses: readonly Expense[], currency: Currency): CategoryTotal[] {
  const map = new Map<string, CategoryTotal>();
  for (const e of expenses) {
    const entry = map.get(e.categoryId) ?? { categoryId: e.categoryId, total: 0, count: 0 };
    entry.total += amountIn(e, currency);
    entry.count += 1;
    map.set(e.categoryId, entry);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

/* ---------- Фильтры ---------- */

export interface ExpenseFilters {
  categoryIds: string[];
  merchant: string;
  minAmount: number | null;
  maxAmount: number | null;
  source: ExpenseSource | 'all';
}

export const EMPTY_FILTERS: ExpenseFilters = {
  categoryIds: [],
  merchant: '',
  minAmount: null,
  maxAmount: null,
  source: 'all',
};

export function hasActiveFilters(f: ExpenseFilters): boolean {
  return (
    f.categoryIds.length > 0 ||
    f.merchant.trim() !== '' ||
    f.minAmount !== null ||
    f.maxAmount !== null ||
    f.source !== 'all'
  );
}

export function applyFilters(
  expenses: readonly Expense[],
  filters: ExpenseFilters,
  currency: Currency,
): Expense[] {
  const merchant = filters.merchant.trim().toLocaleLowerCase();
  return expenses.filter((e) => {
    if (filters.categoryIds.length && !filters.categoryIds.includes(e.categoryId)) return false;
    if (merchant && !(e.merchant ?? '').toLocaleLowerCase().includes(merchant)) return false;
    if (filters.source !== 'all' && e.source !== filters.source) return false;
    const value = amountIn(e, currency);
    if (filters.minAmount !== null && value < filters.minAmount) return false;
    if (filters.maxAmount !== null && value > filters.maxAmount) return false;
    return true;
  });
}

/** Поиск по магазину, комментарию, позициям и названию категории. */
export function searchExpenses(
  expenses: readonly Expense[],
  query: string,
  categoryName: (categoryId: string) => string,
): Expense[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [...expenses];
  return expenses.filter((e) =>
    [e.merchant, e.comment, categoryName(e.categoryId), ...e.items.map((i) => i.name)]
      .filter(Boolean)
      .some((field) => field!.toLocaleLowerCase().includes(q)),
  );
}
