/**
 * Настройки окружения. Значения задаются переменными VITE_* при сборке
 * (локально — файл .env.local, на хостинге — в настройках проекта).
 * Одна и та же кодовая база собирается в две копии: production (для людей) и staging (для тестов).
 */
const clean = (value: string | undefined) => value?.trim() || undefined;

export type AppEnv = 'production' | 'staging' | 'development';

const appEnv: AppEnv =
  import.meta.env.VITE_APP_ENV === 'production' || import.meta.env.VITE_APP_ENV === 'staging'
    ? import.meta.env.VITE_APP_ENV
    : import.meta.env.PROD
      ? 'production'
      : 'development';

export const ENV = {
  appEnv,
  isProduction: appEnv === 'production',
  version: __APP_VERSION__,
  buildId: __BUILD_ID__,
  supabase: {
    // Допускаем адрес, скопированный вместе с /rest/v1/ — нужен только корень проекта
    url: clean(import.meta.env.VITE_SUPABASE_URL)?.replace(/\/+$/, '').replace(/\/(rest|auth)\/v1$/, ''),
    anonKey: clean(import.meta.env.VITE_SUPABASE_ANON_KEY),
  },
  posthog: {
    key: clean(import.meta.env.VITE_POSTHOG_KEY),
    host: (clean(import.meta.env.VITE_POSTHOG_HOST) ?? 'https://eu.i.posthog.com').replace(/\/+$/, ''),
  },
  /** Функции, включённые для этой сборки независимо от настроек в базе. */
  forcedFeatures: new Set((import.meta.env.VITE_FEATURES ?? '').split(',').map((f) => f.trim()).filter(Boolean)),
} as const;

/** Подключена ли база (вход, синхронизация, отзывы). */
export const HAS_BACKEND = Boolean(ENV.supabase.url && ENV.supabase.anonKey);
