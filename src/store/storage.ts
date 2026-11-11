import {
  DEFAULT_CATEGORIES,
  DEFAULT_CUSTOM_FIELDS,
  FALLBACK_CATEGORY_ID,
  isCategoryColor,
  isCategoryIcon,
  type Category,
} from '@/entities/category';
import type { Expense, ExpenseItem } from '@/entities/expense';
import { isCurrency } from '@/shared/config/currency';
import { LANGUAGES, type Language } from '@/shared/i18n';
import { isISODate } from '@/shared/lib/date';
import { createId } from '@/shared/lib/id';
import { ratesService } from '@/shared/lib/money';
import { createDefaultState, SCHEMA_VERSION } from './reducer';
import type { PersistedState, ScanRecord, Settings, ThemePreference } from './types';

/**
 * Репозиторий состояния. Сейчас — localStorage; когда появится бэкенд,
 * достаточно написать другую реализацию с тем же интерфейсом.
 */
export interface StateRepository {
  load(): Promise<PersistedState>;
  save(state: PersistedState): Promise<void>;
}

const STORAGE_KEY = 'relocate-spend:v2';
const LEGACY_KEY = 'relocate-spend-data';

type Raw = Record<string, unknown>;
const isObject = (v: unknown): v is Raw => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/* ---------- Валидация: всё, что не прошло проверку, отбрасывается, а не роняет приложение ---------- */

function sanitizeItem(raw: unknown): ExpenseItem | null {
  if (!isObject(raw)) return null;
  const name = str(raw.name);
  const price = num(raw.price);
  if (!name || price === undefined) return null;
  return { id: str(raw.id) ?? createId(), name, price };
}

export function sanitizeExpense(raw: unknown, categoryIds: Set<string>): Expense | null {
  if (!isObject(raw)) return null;
  const amount = num(raw.amount);
  const date = typeof raw.date === 'string' ? raw.date.slice(0, 10) : undefined;
  if (amount === undefined || amount <= 0 || !isISODate(date) || !isCurrency(raw.currency)) return null;
  const now = new Date().toISOString();
  const categoryId = str(raw.categoryId);
  return {
    id: str(raw.id) ?? createId(),
    amount,
    currency: raw.currency,
    eurRate: num(raw.eurRate) ?? ratesService.getEurRate(raw.currency, date),
    categoryId: categoryId && categoryIds.has(categoryId) ? categoryId : FALLBACK_CATEGORY_ID,
    date,
    time: typeof raw.time === 'string' && /^\d{2}:\d{2}$/.test(raw.time) ? raw.time : undefined,
    merchant: str(raw.merchant),
    comment: str(raw.comment),
    items: Array.isArray(raw.items) ? raw.items.map(sanitizeItem).filter((i) => i !== null) : [],
    amountFromItems: typeof raw.amountFromItems === 'boolean' ? raw.amountFromItems : undefined,
    source: raw.source === 'qr' ? 'qr' : 'manual',
    createdAt: str(raw.createdAt) ?? now,
    updatedAt: str(raw.updatedAt) ?? now,
  };
}

export function sanitizeCategory(raw: unknown): Category | null {
  if (!isObject(raw)) return null;
  const id = str(raw.id);
  if (!id) return null;
  const builtIn = DEFAULT_CATEGORIES.find((c) => c.id === id);
  const fields = isObject(raw.fields)
    ? { merchant: raw.fields.merchant !== false, items: raw.fields.items !== false }
    : (builtIn?.fields ?? DEFAULT_CUSTOM_FIELDS);
  return {
    id,
    name: str(raw.name),
    color: isCategoryColor(raw.color) ? raw.color : (builtIn?.color ?? 'c7'),
    icon: isCategoryIcon(raw.icon) ? raw.icon : (builtIn?.icon ?? 'grid'),
    fields,
    builtIn: Boolean(builtIn),
  };
}

export function sanitizeSettings(raw: unknown): Settings {
  const defaults = createDefaultState().settings;
  if (!isObject(raw)) return defaults;
  const theme: ThemePreference[] = ['light', 'dark', 'system'];
  return {
    baseCurrency: isCurrency(raw.baseCurrency) ? raw.baseCurrency : defaults.baseCurrency,
    theme: theme.includes(raw.theme as ThemePreference) ? (raw.theme as ThemePreference) : defaults.theme,
    language: LANGUAGES.includes(raw.language as Language) ? (raw.language as Language) : defaults.language,
    createdAt: isISODate(raw.createdAt) ? raw.createdAt : defaults.createdAt,
    hiddenCategories: Array.isArray(raw.hiddenCategories)
      ? [...new Set(raw.hiddenCategories.filter((id): id is string => typeof id === 'string'))]
      : [],
  };
}

export function sanitizeState(raw: unknown): PersistedState {
  if (!isObject(raw)) return createDefaultState();
  let categories = Array.isArray(raw.categories)
    ? raw.categories.map(sanitizeCategory).filter((c) => c !== null)
    : [];
  if (categories.length === 0) categories = DEFAULT_CATEGORIES;
  // Категория «Прочее» должна существовать всегда — в неё переносятся расходы.
  if (!categories.some((c) => c.id === FALLBACK_CATEGORY_ID)) {
    categories = [...categories, DEFAULT_CATEGORIES.find((c) => c.id === FALLBACK_CATEGORY_ID)!];
  }
  const ids = new Set(categories.map((c) => c.id));
  const expenses = Array.isArray(raw.expenses)
    ? raw.expenses.map((e) => sanitizeExpense(e, ids)).filter((e) => e !== null)
    : [];
  const scans = Array.isArray(raw.scans)
    ? raw.scans.filter(
        (s): s is ScanRecord => isObject(s) && typeof s.id === 'string' && isISODate(s.date),
      )
    : // Данные до появления журнала: считаем сканами уже сохранённые QR-расходы
      expenses.filter((e) => e.source === 'qr').map((e) => ({ id: `expense-${e.id}`, date: e.date }));
  return { version: SCHEMA_VERSION, categories, expenses, settings: sanitizeSettings(raw.settings), scans };
}

/* ---------- Миграция со старой версии приложения (v1, ключ relocate-spend-data) ---------- */

const LEGACY_CATEGORY_IDS = new Set(DEFAULT_CATEGORIES.map((c) => c.id));

function migrateLegacy(raw: unknown): PersistedState {
  if (!isObject(raw)) return createDefaultState();
  const categories = Array.isArray(raw.categories)
    ? raw.categories.filter(isObject).map((c) => {
        const id = str(c.id) ?? createId();
        // У стандартных категорий не сохраняем старое русское имя — пусть переводится.
        return LEGACY_CATEGORY_IDS.has(id) ? { id } : { id, name: str(c.name) };
      })
    : undefined;
  return sanitizeState({
    categories,
    expenses: raw.expenses,
    settings: {
      baseCurrency: raw.baseCurrency,
      theme: raw.theme,
      language: raw.language,
    },
  });
}

/* ---------- localStorage ---------- */

function readJson(key: string): unknown {
  const text = localStorage.getItem(key);
  if (text === null) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    // Битые данные не должны давать белый экран: откладываем копию и начинаем с чистого листа.
    localStorage.setItem(`${key}:corrupted:${Date.now()}`, text);
    localStorage.removeItem(key);
    return undefined;
  }
}

export const localStorageRepository: StateRepository = {
  async load() {
    const current = readJson(STORAGE_KEY);
    if (current !== undefined) return sanitizeState(current);
    const legacy = readJson(LEGACY_KEY);
    if (legacy !== undefined) return migrateLegacy(legacy);
    return createDefaultState();
  },
  async save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
};
