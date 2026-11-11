import { useSyncExternalStore } from 'react';
import { supabaseRequest } from '@/shared/api/supabase/http';
import { ENV, HAS_BACKEND } from './env';

/**
 * Флаги функций. Значение складывается из трёх источников (по приоритету):
 * 1. VITE_FEATURES при сборке — например, на тестовой копии "qrScan" включён всегда;
 * 2. таблица app_config в Supabase (строка key = 'features') — включается без пересборки,
 *    у всех пользователей на следующем запуске;
 * 3. значения по умолчанию ниже.
 */
export const FEATURES = {
  /** Сканирование QR-чеков. Выключено: на экране добавления — плашка «Скоро». */
  qrScan: false,
  /** Тариф Pro и лимит сканов в профиле. Выключено: полностью скрыто. */
  pro: false,
} as const;

export type FeatureName = keyof typeof FEATURES;

const CACHE_KEY = 'relocate-spend:remote-config';
const REFRESH_MS = 10 * 60 * 1000;

interface RemoteConfig {
  features: Partial<Record<FeatureName, boolean>>;
  fetchedAt: number;
}

let remote: RemoteConfig = readCache();
let version = 0;
const listeners = new Set<() => void>();

function readCache(): RemoteConfig {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null') as RemoteConfig | null;
    if (parsed && typeof parsed.features === 'object') return parsed;
  } catch {
    /* нет кеша */
  }
  return { features: {}, fetchedAt: 0 };
}

export function isFeatureOn(name: FeatureName): boolean {
  if (ENV.forcedFeatures.has(name)) return true;
  return remote.features[name] ?? FEATURES[name];
}

/** Загрузить флаги из базы (раз в 10 минут; при ошибке остаются прежние). */
export async function refreshRemoteConfig(force = false) {
  if (!HAS_BACKEND || (!force && Date.now() - remote.fetchedAt < REFRESH_MS)) return;
  try {
    const rows = await supabaseRequest<{ key: string; value: unknown }[]>('/rest/v1/app_config?select=key,value');
    const featureRow = rows.find((r) => r.key === 'features')?.value;
    const features: RemoteConfig['features'] = {};
    if (featureRow && typeof featureRow === 'object') {
      for (const name of Object.keys(FEATURES) as FeatureName[]) {
        const v = (featureRow as Record<string, unknown>)[name];
        if (typeof v === 'boolean') features[name] = v;
      }
    }
    remote = { features, fetchedAt: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(remote));
    version++;
    listeners.forEach((l) => l());
  } catch {
    /* офлайн или таблицы ещё нет — работаем по кешу */
  }
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Включена ли функция; компонент перерисуется, когда флаги обновятся из базы. */
export function useFeature(name: FeatureName): boolean {
  useSyncExternalStore(subscribe, () => version, () => version);
  return isFeatureOn(name);
}
