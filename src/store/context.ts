import { createContext, useContext, useMemo } from 'react';
import { DEFAULT_CUSTOM_FIELDS, type Category } from '@/entities/category';
import { today } from '@/shared/lib/date';
import { hashString } from '@/shared/lib/id';
import type { Actions } from './actions';
import type { SyncApi } from './sync/useCloudSync';
import type { AppState } from './types';

export const StateContext = createContext<AppState | null>(null);
export const SyncContext = createContext<SyncApi | null>(null);
export const ActionsContext = createContext<(Actions & { reload: () => void }) | null>(null);

export function useAppState(): AppState {
  const ctx = useContext(StateContext);
  if (!ctx) throw new Error('useAppState must be used within StoreProvider');
  return ctx;
}

/** Действия стабильны между рендерами — их безопасно класть в зависимости хуков. */
export function useActions() {
  const ctx = useContext(ActionsContext);
  if (!ctx) throw new Error('useActions must be used within StoreProvider');
  return ctx;
}

export function useSettings() {
  return useAppState().settings;
}

/**
 * Категории для показа: свои + чужие из трат групп (только для отображения, virtual).
 * Для выбора и редактирования — useOwnCategories.
 */
export function useCategories(): Category[] {
  const { categories, expenses } = useAppState();
  return useMemo(() => {
    const known = new Set(categories.map((c) => c.id));
    const extra: Category[] = [];
    for (const e of expenses) {
      if (!e.categorySnapshot || known.has(e.categoryId)) continue;
      known.add(e.categoryId);
      extra.push({
        id: e.categoryId,
        name: e.categorySnapshot.name,
        color: e.categorySnapshot.color as Category['color'],
        icon: e.categorySnapshot.icon as Category['icon'],
        fields: DEFAULT_CUSTOM_FIELDS,
        builtIn: false,
        virtual: true,
      });
    }
    return extra.length ? [...categories, ...extra] : categories;
  }, [categories, expenses]);
}

/** Только свои категории — для выбора в форме и страницы «Категории». */
export function useOwnCategories(): Category[] {
  return useAppState().categories;
}

export function useCategory(id: string | undefined) {
  return useCategories().find((c) => c.id === id);
}

export function useExpense(id: string | undefined) {
  return useAppState().expenses.find((e) => e.id === id);
}

/** Сканы QR за текущий месяц и проверка бесплатного лимита. */
export function useScanQuota(limit: number) {
  const { scans } = useAppState();
  const month = today().slice(0, 7);
  const used = scans.filter((s) => s.date.startsWith(month)).length;
  return {
    used,
    limit,
    remaining: Math.max(0, limit - used),
    /** Повторный скан уже засчитанного чека разрешён и при исчерпанном лимите. */
    canScan: (qrText: string) => used < limit || scans.some((s) => s.id === hashString(qrText)),
  };
}

/** Облачная синхронизация: статус, выход, удаление аккаунта. */
export function useSync(): SyncApi {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within StoreProvider');
  return ctx;
}
