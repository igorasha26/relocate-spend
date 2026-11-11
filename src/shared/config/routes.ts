/**
 * Все пути в одном месте — чтобы не разбрасывать строки по компонентам.
 * Пример: navigate(routes.expense('42')).
 */
export const routes = {
  home: '/',
  add: '/add',
  expense: (id: string) => `/expense/${encodeURIComponent(id)}`,
  editExpense: (id: string) => `/expense/${encodeURIComponent(id)}/edit`,
  scan: '/scan',
  scanReview: '/scan/review',
  profile: '/profile',
  categories: '/profile/categories',
  pro: '/profile/pro',
  /** Вход в аккаунт. */
  login: '/auth',
  signup: '/auth/signup',
  resetPassword: '/auth/reset',
  privacy: '/privacy',
  /** Главная с фильтром по категории. */
  homeWithCategory: (categoryId: string) => `/?category=${encodeURIComponent(categoryId)}`,
} as const;

/** Версия для показа пользователю. */
export const APP_VERSION = __APP_VERSION__;

/** Лимит QR-чеков в месяц на бесплатном тарифе. */
export const FREE_SCAN_LIMIT = 15;
