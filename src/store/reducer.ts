import { DEFAULT_CATEGORIES, FALLBACK_CATEGORY_ID } from '@/entities/category';
import type { Expense } from '@/entities/expense';
import { addMonths, today } from '@/shared/lib/date';
import type { Action, AppState, PersistedState } from './types';

export const SCHEMA_VERSION = 2;

export function createDefaultState(): PersistedState {
  return {
    version: SCHEMA_VERSION,
    expenses: [],
    categories: DEFAULT_CATEGORIES,
    settings: {
      baseCurrency: 'RSD',
      theme: 'system',
      language: 'ru',
      createdAt: today(),
    },
    scans: [],
  };
}

export const initialState: AppState = { ...createDefaultState(), status: 'loading' };

const touch = (e: Expense): Expense => ({ ...e, updatedAt: new Date().toISOString() });

function mapExpense(state: AppState, id: string, fn: (e: Expense) => Expense): AppState {
  return { ...state, expenses: state.expenses.map((e) => (e.id === id ? touch(fn(e)) : e)) };
}

/** Чистая функция: никаких id, дат и запросов внутри — всё приходит в action. */
export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load/start':
      return { ...state, status: 'loading' };
    case 'load/success':
      return { ...action.payload, status: 'ready' };
    case 'load/failure':
      return { ...state, status: 'error' };

    case 'expense/add':
      return { ...state, expenses: [action.payload, ...state.expenses] };
    case 'expense/update':
      return mapExpense(state, action.payload.id, (e) => ({ ...e, ...action.payload.patch }));
    case 'expense/remove':
      return { ...state, expenses: state.expenses.filter((e) => e.id !== action.payload.id) };

    case 'item/add':
      return mapExpense(state, action.payload.expenseId, (e) => ({
        ...e,
        items: [...e.items, action.payload.item],
      }));
    case 'item/update':
      return mapExpense(state, action.payload.expenseId, (e) => ({
        ...e,
        items: e.items.map((i) => (i.id === action.payload.item.id ? action.payload.item : i)),
      }));
    case 'item/remove':
      return mapExpense(state, action.payload.expenseId, (e) => ({
        ...e,
        items: e.items.filter((i) => i.id !== action.payload.itemId),
      }));

    case 'category/add':
      return { ...state, categories: [...state.categories, action.payload] };
    case 'category/update':
      return {
        ...state,
        categories: state.categories.map((c) =>
          c.id === action.payload.id ? { ...c, ...action.payload.patch } : c,
        ),
      };
    case 'category/remove': {
      const { id } = action.payload;
      if (id === FALLBACK_CATEGORY_ID) return state;
      return {
        ...state,
        categories: state.categories.filter((c) => c.id !== id),
        expenses: state.expenses.map((e) =>
          e.categoryId === id ? { ...e, categoryId: FALLBACK_CATEGORY_ID } : e,
        ),
      };
    }

    case 'settings/update':
      return { ...state, settings: { ...state.settings, ...action.payload } };

    case 'scan/record': {
      if (state.scans.some((s) => s.id === action.payload.id)) return state;
      // Храним только последний год — для лимита нужен текущий месяц
      const cutoff = addMonths(action.payload.date, -12);
      return { ...state, scans: [...state.scans.filter((s) => s.date >= cutoff), action.payload] };
    }

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
