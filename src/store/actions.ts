import { DEFAULT_CATEGORIES, DEFAULT_CUSTOM_FIELDS, type Category } from '@/entities/category';
import type { Expense, ExpenseInput, ExpenseItem } from '@/entities/expense';
import { analytics } from '@/shared/analytics';
import { today } from '@/shared/lib/date';
import { createId, hashString } from '@/shared/lib/id';
import { ratesService } from '@/shared/lib/money';
import type { Action, Settings } from './types';

/**
 * Всё «нечистое» (id, время, курсы) происходит здесь, а reducer остаётся чистым.
 * Компоненты получают эти функции через useActions().
 */
export function createActions(dispatch: (action: Action) => void) {
  return {
    addExpense(input: ExpenseInput): Expense {
      const now = new Date().toISOString();
      const expense: Expense = {
        ...input,
        id: createId(),
        eurRate: ratesService.getEurRate(input.currency, input.date),
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

    updateExpense(id: string, input: Partial<ExpenseInput>) {
      const patch: Partial<Expense> = { ...input };
      // Сменилась валюта или дата — фиксируем курс на новую дату покупки.
      if (input.currency) patch.eurRate = ratesService.getEurRate(input.currency, input.date);
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
