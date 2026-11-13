import { DEFAULT_CATEGORIES, DEFAULT_CUSTOM_FIELDS, type Category } from '@/entities/category';
import type { Expense, ExpenseInput, ExpenseItem } from '@/entities/expense';
import { analytics } from '@/shared/analytics';
import { today, type ISODate } from '@/shared/lib/date';
import { createId, hashString } from '@/shared/lib/id';
import { getRatesFor, type RateTable } from '@/shared/lib/rates';
import type { Action, Settings } from './types';

/**
 * Всё «нечистое» (id, время, курсы) происходит здесь, а reducer остаётся чистым.
 * Компоненты получают эти функции через useActions().
 */
/** Курсы на дату покупки: фиксируются в трате, чтобы пересчёт не менялся со временем. */
function rateFields(currency: Expense['currency'], date: Expense['date']) {
  const { rates, date: ratesDate } = getRatesFor(date);
  return { eurRate: rates[currency], rates, ratesDate: ratesDate ?? undefined };
}

export function createActions(dispatch: (action: Action) => void) {
  return {
    addExpense(input: ExpenseInput): Expense {
      const now = new Date().toISOString();
      const expense: Expense = {
        ...input,
        id: createId(),
        ...rateFields(input.currency, input.date),
        createdAt: now,
        updatedAt: now,
      };
      dispatch({ type: 'expense/add', payload: expense });
      analytics.track('expense_added', {
        source: expense.source,
        items: expense.items.length,
        currency: expense.currency,
        // названия своих категорий не отправляем — только «custom»
        category: DEFAULT_CATEGORIES.some((c) => c.id === expense.categoryId) ? expense.categoryId : 'custom',
      });
      return expense;
    },

    /** previous — расход до правки: курсы пересчитываются, только если сменились валюта или дата. */
    updateExpense(id: string, input: Partial<ExpenseInput>, previous?: Pick<Expense, 'currency' | 'date' | 'rates'>) {
      const patch: Partial<Expense> = { ...input };
      const currency = input.currency ?? previous?.currency;
      const date = input.date ?? previous?.date;
      const currencyChanged = input.currency !== undefined && input.currency !== previous?.currency;
      const dateChanged = input.date !== undefined && input.date !== previous?.date;
      const legacy = previous !== undefined && !previous.rates; // старая трата без таблицы курсов
      if (currency && date && (currencyChanged || dateChanged || legacy)) Object.assign(patch, rateFields(currency, date));
      dispatch({ type: 'expense/update', payload: { id, patch } });
      analytics.track('expense_edited');
    },

    removeExpense(id: string) {
      dispatch({ type: 'expense/remove', payload: { id } });
      analytics.track('expense_deleted');
    },

    addItem(expenseId: string, item: Omit<ExpenseItem, 'id'>) {
      dispatch({ type: 'item/add', payload: { expenseId, item: { ...item, id: createId() } } });
    },

    updateItem(expenseId: string, item: ExpenseItem) {
      dispatch({ type: 'item/update', payload: { expenseId, item } });
    },

    removeItem(expenseId: string, itemId: string) {
      dispatch({ type: 'item/remove', payload: { expenseId, itemId } });
    },

    addCategory(input: Pick<Category, 'name' | 'color' | 'icon'>): Category {
      const category: Category = { ...input, id: createId(), fields: DEFAULT_CUSTOM_FIELDS, builtIn: false };
      dispatch({ type: 'category/add', payload: category });
      analytics.track('category_created');
      return category;
    },

    updateCategory(id: string, patch: Partial<Pick<Category, 'name' | 'color' | 'icon' | 'fields'>>) {
      dispatch({ type: 'category/update', payload: { id, patch } });
    },

    removeCategory(id: string) {
      dispatch({ type: 'category/remove', payload: { id } });
    },

    /** Засчитать скан QR-чека (вызывается после успешного чтения чека). */
    recordScan(qrText: string) {
      dispatch({ type: 'scan/record', payload: { id: hashString(qrText), date: today() } });
    },

    /** Уточнить курсы трат по их датам (фоновая задача, не считается правкой). */
    setExpenseRates(updates: { id: string; eurRate: number; rates: RateTable; ratesDate: ISODate }[]) {
      if (updates.length) dispatch({ type: 'expense/setRates', payload: updates });
    },

    /** «Глазок» на главной: не учитывать категорию в кольце и итогах (или вернуть). */
    toggleCategoryHidden(id: string, hidden: boolean) {
      dispatch({ type: 'category/toggleHidden', payload: { id } });
      analytics.track(hidden ? 'category_hidden' : 'category_shown', {
        category: DEFAULT_CATEGORIES.some((c) => c.id === id) ? id : 'custom',
      });
    },

    updateSettings(patch: Partial<Settings>) {
      dispatch({ type: 'settings/update', payload: patch });
    },
  };
}

export type Actions = ReturnType<typeof createActions>;
