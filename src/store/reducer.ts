import { DEFAULT_CATEGORIES, DEFAULT_CUSTOM_FIELDS, FALLBACK_CATEGORY_ID, type Category } from '@/entities/category';
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
      hiddenCategories: [],
    },
    scans: [],
  };
}

export const initialState: AppState = { ...createDefaultState(), status: 'loading' };

const touch = (e: Expense): Expense => ({ ...e, updatedAt: new Date().toISOString() });

function mapExpense(state: AppState, id: string, fn: (e: Expense) => Expense): AppState {
  return { ...state, expenses: state.expenses.map((e) => (e.id === id ? touch(fn(e)) : e)) };
}

/**
 * Трата группы со своей (не стандартной) категорией несёт копию категории —
 * чтобы участники, у которых такой категории нет, видели название, цвет и иконку.
 */
function withGroupFields(state: Pick<AppState, 'categories'>, e: Expense): Expense {
  if (!e.groupId) return e;
  const own = state.categories.find((c) => c.id === e.categoryId);
  if (!own) return e; // чужая категория — копия уже есть
  if (own.builtIn) return e.categorySnapshot ? { ...e, categorySnapshot: undefined } : e;
  return { ...e, categorySnapshot: { name: own.name ?? '', color: own.color, icon: own.icon } };
}

/** Замена/добавление по id и удаление; новые расходы — в начало (как при добавлении вручную). */
function mergeById<T extends { id: string }>(list: T[], upsert: T[], remove: string[], prepend = false): T[] {
  if (upsert.length === 0 && remove.length === 0) return list;
  const incoming = new Map(upsert.map((x) => [x.id, x]));
  const removed = new Set(remove);
  const kept = list.filter((x) => !removed.has(x.id)).map((x) => incoming.get(x.id) ?? x);
  const known = new Set(list.map((x) => x.id));
  const added = upsert.filter((x) => !known.has(x.id) && !removed.has(x.id));
  return prepend ? [...added, ...kept] : [...kept, ...added];
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
      return { ...state, expenses: [withGroupFields(state, action.payload), ...state.expenses] };
    case 'expense/update': {
      const { patch, me } = action.payload;
      return mapExpense(state, action.payload.id, (e) => {
        const next = withGroupFields(state, { ...e, ...patch });
        // В группе видно, кто последним поправил трату (если не автор)
        if (next.groupId && me) next.editor = me.id === next.author?.id ? undefined : me;
        return next;
      });
    }
    case 'expense/move': {
      const { ids, groupId, me } = action.payload;
      const moving = new Set(ids);
      const now = new Date().toISOString();
      let categories = state.categories;
      const expenses = state.expenses.map((e) => {
        if (!moving.has(e.id)) return e;
        if (groupId) {
          return withGroupFields(state, { ...e, groupId, author: e.author ?? me ?? undefined, editor: undefined, updatedAt: now });
        }
        // Обратно в личные: чужая категория из группы становится своей, чтобы трата не потеряла её
        const { groupId: _g, author: _a, editor: _e, categorySnapshot, ...personal } = e;
        if (categorySnapshot && !categories.some((c) => c.id === e.categoryId)) {
          categories = [
            ...categories,
            {
              id: e.categoryId,
              name: categorySnapshot.name,
              color: categorySnapshot.color as Category['color'],
              icon: categorySnapshot.icon as Category['icon'],
              fields: DEFAULT_CUSTOM_FIELDS,
              builtIn: false,
            },
          ];
        }
        return { ...personal, updatedAt: now };
      });
      return { ...state, expenses, categories };
    }
    case 'expense/dropGroups': {
      const keep = new Set(action.payload.keepGroupIds);
      const expenses = state.expenses.filter((e) => !e.groupId || keep.has(e.groupId));
      return expenses.length === state.expenses.length ? state : { ...state, expenses };
    }
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
        settings: { ...state.settings, hiddenCategories: state.settings.hiddenCategories.filter((h) => h !== id) },
      };
    }

    case 'expense/setRates': {
      const byId = new Map(action.payload.map((p) => [p.id, p]));
      return {
        ...state,
        expenses: state.expenses.map((e) => {
          const p = byId.get(e.id);
          return p ? { ...e, eurRate: p.eurRate, rates: p.rates, ratesDate: p.ratesDate } : e;
        }),
      };
    }

    case 'category/toggleHidden': {
      const { id } = action.payload;
      const hidden = state.settings.hiddenCategories;
      return {
        ...state,
        settings: {
          ...state.settings,
          hiddenCategories: hidden.includes(id) ? hidden.filter((h) => h !== id) : [...hidden, id],
        },
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

    case 'sync/apply': {
      const { expenses, categories, scans, settings } = action.payload;
      return {
        ...state,
        expenses: mergeById(state.expenses, expenses.upsert, expenses.remove, true),
        categories: mergeById(state.categories, categories.upsert, categories.remove),
        scans: mergeById(state.scans, scans.upsert, scans.remove),
        settings: settings ?? state.settings,
      };
    }
    case 'sync/reset':
      return { ...action.payload, status: 'ready' };

    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}
