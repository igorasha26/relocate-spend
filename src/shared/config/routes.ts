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
  /** Главная с фильтром по категории. */
  homeWithCategory: (categoryId: string) => `/?category=${encodeURIComponent(categoryId)}`,
} as const;

export const APP_VERSION = '1.0';

/** Лимит QR-чеков в месяц на бесплатном тарифе. */
export const FREE_SCAN_LIMIT = 15;
