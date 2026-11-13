/** Значки категорий. Новые добавляются в `shared/ui/Icon` и сюда. */
export const CATEGORY_ICONS = [
  'doc',
  'cart',
  'home',
  'bus',
  'wifi',
  'grid',
  'sofa',
  'medical',
  'book',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

/**
 * Цвета — это токены, а не HEX: в светлой и тёмной теме
 * один и тот же токен рисуется разным оттенком (см. tokens.css, --cat-*).
 */
export const CATEGORY_COLORS = ['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];

/** Какие дополнительные поля показывать в форме расхода. */
export interface CategoryFields {
  merchant: boolean;
  items: boolean;
}

export interface Category {
  id: string;
  /** Пользовательское название. У стандартных категорий может отсутствовать — тогда берётся перевод. */
  name?: string;
  color: CategoryColor;
  icon: CategoryIcon;
  fields: CategoryFields;
  /** Стандартная категория (есть перевод по id). */
  builtIn: boolean;
  /** Чужая категория из траты группы: только для показа, не хранится и не редактируется. */
  virtual?: boolean;
}

/** Категория, в которую переносятся расходы удалённых категорий. Удалить её нельзя. */
export const FALLBACK_CATEGORY_ID = 'other';

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'housing', color: 'c1', icon: 'home', fields: { merchant: false, items: false }, builtIn: true },
  { id: 'docs', color: 'c3', icon: 'doc', fields: { merchant: true, items: false }, builtIn: true },
  { id: 'food', color: 'c2', icon: 'cart', fields: { merchant: true, items: true }, builtIn: true },
  { id: 'transport', color: 'c6', icon: 'bus', fields: { merchant: false, items: false }, builtIn: true },
  { id: 'furniture', color: 'c4', icon: 'sofa', fields: { merchant: true, items: true }, builtIn: true },
  { id: 'medicine', color: 'c5', icon: 'medical', fields: { merchant: true, items: true }, builtIn: true },
  { id: 'internet', color: 'c6', icon: 'wifi', fields: { merchant: true, items: false }, builtIn: true },
  { id: FALLBACK_CATEGORY_ID, color: 'c7', icon: 'grid', fields: { merchant: true, items: true }, builtIn: true },
];

export const DEFAULT_CUSTOM_FIELDS: CategoryFields = { merchant: true, items: true };

export function isCategoryIcon(value: unknown): value is CategoryIcon {
  return typeof value === 'string' && (CATEGORY_ICONS as readonly string[]).includes(value);
}

export function isCategoryColor(value: unknown): value is CategoryColor {
  return typeof value === 'string' && (CATEGORY_COLORS as readonly string[]).includes(value);
}
