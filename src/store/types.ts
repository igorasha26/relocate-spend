import type { Category } from '@/entities/category';
import type { Expense, ExpenseItem } from '@/entities/expense';
import type { Currency } from '@/shared/config/currency';
import type { Language } from '@/shared/i18n';
import type { ISODate } from '@/shared/lib/date';

export type ThemePreference = 'light' | 'dark' | 'system';

export interface Settings {
  baseCurrency: Currency;
  theme: ThemePreference;
  language: Language;
  /** Дата первого запуска — «С вами с …». */
  createdAt: ISODate;
}

/**
 * Запись о сканировании QR-чека. Хранится отдельно от расходов:
 * удаление расхода не возвращает потраченный скан бесплатного лимита.
 */
export interface ScanRecord {
  /** Хеш содержимого QR — повторный скан того же чека не считается дважды. */
  id: string;
  date: ISODate;
}

/** То, что сохраняется на диск. При изменении формы — поднять SCHEMA_VERSION и дописать миграцию. */
export interface PersistedState {
  version: number;
  expenses: Expense[];
  categories: Category[];
  settings: Settings;
  scans: ScanRecord[];
}

export type LoadStatus = 'loading' | 'ready' | 'error';

export interface AppState extends PersistedState {
  status: LoadStatus;
}

export type Action =
  | { type: 'load/start' }
  | { type: 'load/success'; payload: PersistedState }
  | { type: 'load/failure' }
  | { type: 'expense/add'; payload: Expense }
  | { type: 'expense/update'; payload: { id: string; patch: Partial<Omit<Expense, 'id' | 'createdAt'>> } }
  | { type: 'expense/remove'; payload: { id: string } }
  | { type: 'item/add'; payload: { expenseId: string; item: ExpenseItem } }
  | { type: 'item/update'; payload: { expenseId: string; item: ExpenseItem } }
  | { type: 'item/remove'; payload: { expenseId: string; itemId: string } }
  | { type: 'category/add'; payload: Category }
  | { type: 'category/update'; payload: { id: string; patch: Partial<Omit<Category, 'id' | 'builtIn'>> } }
  | { type: 'category/remove'; payload: { id: string } }
  | { type: 'settings/update'; payload: Partial<Settings> }
  | { type: 'scan/record'; payload: ScanRecord }
  /** Изменения, пришедшие из облака (другое устройство или первый вход). */
  | { type: 'sync/apply'; payload: SyncPatch }
  /** Выход из аккаунта: данные аккаунта убираются с устройства. */
  | { type: 'sync/reset'; payload: PersistedState };

interface EntityPatch<T> {
  upsert: T[];
  remove: string[];
}

export interface SyncPatch {
  expenses: EntityPatch<Expense>;
  categories: EntityPatch<Category>;
  scans: EntityPatch<ScanRecord>;
  settings?: Settings;
}
