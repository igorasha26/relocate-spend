import type { Category } from '@/entities/category';
import { isAmountFromItems, itemsTotal, type Expense, type ExpenseInput, type ExpenseItem, type ExpenseSource } from '@/entities/expense';
import type { Currency } from '@/shared/config/currency';
import { nowTime, today, type ISODate } from '@/shared/lib/date';
import { parseAmount } from '@/shared/lib/money';

/** Состояние формы: сумма — строкой, как её ввёл пользователь. */
export interface ExpenseDraft {
  amount: string;
  currency: Currency;
  categoryId: string | null;
  date: ISODate;
  time?: string;
  merchant: string;
  comment: string;
  items: ExpenseItem[];
  /** Сумма = сумма позиций (включено по умолчанию). */
  amountFromItems: boolean;
  source: ExpenseSource;
}

const formatAmountForInput = (value: number) => String(value).replace('.', ',');

export function emptyDraft(currency: Currency): ExpenseDraft {
  return {
    amount: '',
    currency,
    categoryId: null,
    date: today(),
    merchant: '',
    comment: '',
    items: [],
    amountFromItems: true,
    source: 'manual',
  };
}

export function draftFromExpense(expense: Expense): ExpenseDraft {
  return {
    amount: formatAmountForInput(expense.amount),
    currency: expense.currency,
    categoryId: expense.categoryId,
    date: expense.date,
    time: expense.time,
    merchant: expense.merchant ?? '',
    comment: expense.comment ?? '',
    items: expense.items,
    amountFromItems: isAmountFromItems(expense),
    source: expense.source,
  };
}

export type DraftErrors = Partial<Record<'amount' | 'categoryId', true>>;

/** Позиции участвуют в сумме: категория их поддерживает, тумблер включён и они есть. */
export function usesItemsTotal(draft: ExpenseDraft, category?: Category): boolean {
  const itemsAllowed = category ? category.fields.items : true;
  return itemsAllowed && draft.amountFromItems && draft.items.length > 0;
}

/** Итоговая сумма черновика с учётом синхронизации с позициями. */
export function draftAmount(draft: ExpenseDraft, category?: Category): number {
  return usesItemsTotal(draft, category) ? itemsTotal(draft.items) : parseAmount(draft.amount);
}

export function validateDraft(draft: ExpenseDraft, category?: Category): DraftErrors {
  const errors: DraftErrors = {};
  if (draftAmount(draft, category) <= 0) errors.amount = true;
  if (!draft.categoryId) errors.categoryId = true;
  return errors;
}

export const isDraftValid = (draft: ExpenseDraft, category?: Category) =>
  Object.keys(validateDraft(draft, category)).length === 0;

/**
 * Черновик → данные для store. Поля, которые категория не использует
 * (например, магазин у «Жилья»), не сохраняются.
 */
export function draftToInput(draft: ExpenseDraft, category: Category | undefined): ExpenseInput {
  const fields = category?.fields ?? { merchant: true, items: true };
  const merchant = draft.merchant.trim();
  const comment = draft.comment.trim();
  return {
    amount: draftAmount(draft, category),
    currency: draft.currency,
    categoryId: draft.categoryId!,
    date: draft.date,
    // Ручной ввод «на сегодня» — фиксируем текущее время, как в чеке.
    time: draft.time ?? (draft.date === today() ? nowTime() : undefined),
    merchant: fields.merchant && merchant ? merchant : undefined,
    comment: comment || undefined,
    items: fields.items ? draft.items : [],
    amountFromItems: draft.amountFromItems,
    source: draft.source,
  };
}
