/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Адрес проекта Supabase: https://xxxx.supabase.co. Без него приложение работает только локально. */
  readonly VITE_SUPABASE_URL?: string;
  /** Публичный ключ Supabase (anon / publishable). Его можно видеть всем — доступ ограничивают правила RLS. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Ключ проекта PostHog (phc_…). Без него аналитика выключена. */
  readonly VITE_POSTHOG_KEY?: string;
  /** Сервер PostHog, по умолчанию европейский: https://eu.i.posthog.com */
  readonly VITE_POSTHOG_HOST?: string;
  /** production | staging. На staging в профиле видна пометка «тестовая сборка». */
  readonly VITE_APP_ENV?: string;
  /** Принудительно включённые функции через запятую, например "qrScan,pro" — для тестовой копии. */
  readonly VITE_FEATURES?: string;
  /** Бэкенд-прокси для загрузки фискальных чеков (см. features/receipt-scan/receiptService.ts). */
  readonly VITE_RECEIPT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

/** Версия из package.json (подставляет Vite). */
declare const __APP_VERSION__: string;
/** Уникальный номер сборки (подставляет Vite). */
declare const __BUILD_ID__: string;
