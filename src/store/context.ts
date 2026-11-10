import { createContext, useContext } from 'react';
import { today } from '@/shared/lib/date';
import { hashString } from '@/shared/lib/id';
import type { Actions } from './actions';
import type { AppState } from './types';

export const StateContext = createContext<AppState | null>(null);
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

export function useCategories() {
  return useAppState().categories;
}

export function useCategory(id: string | undefined) {
  return useAppState().categories.find((c) => c.id === id);
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
