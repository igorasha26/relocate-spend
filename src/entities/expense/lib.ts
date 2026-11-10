import type { Expense, ExpenseItem } from './model';

/** Заголовок расхода в списке: магазин → комментарий → категория. */
export function expenseTitle(expense: Expense, categoryName: string): string {
  return expense.merchant?.trim() || expense.comment?.trim() || categoryName;
}

export const itemsTotal = (items: ExpenseItem[]) => Math.round(items.reduce((s, i) => s + i.price, 0) * 100) / 100;

/**
 * Считается ли сумма по позициям. Новые чеки — да по умолчанию;
 * у старых записей без флага — если сумма и так совпадает с позициями.
 */
export function isAmountFromItems(expense: Pick<Expense, 'amount' | 'items' | 'amountFromItems'>): boolean {
  if (expense.amountFromItems !== undefined) return expense.amountFromItems;
  return expense.items.length === 0 || Math.abs(expense.amount - itemsTotal(expense.items)) < 0.01;
}
