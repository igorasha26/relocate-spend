import { useCallback, useMemo } from 'react';
import { useI18n } from '@/shared/i18n';
import type { Category } from './model';

/**
 * Возвращает функции для отображаемого имени категории.
 * Пользовательское имя важнее перевода; стандартные категории переводятся по id.
 */
export function useCategoryName() {
  const { t, tDynamic } = useI18n();

  const full = useCallback(
    (category: Category | undefined) => {
      if (!category) return t('list.noCategory');
      if (category.name) return category.name;
      return tDynamic(`categories.names.${category.id}`, category.id);
    },
    [t, tDynamic],
  );

  const short = useCallback(
    (category: Category | undefined) => {
      if (!category) return t('list.noCategory');
      if (category.name) return category.name;
      return tDynamic(`categories.short.${category.id}`, full(category));
    },
    [t, tDynamic, full],
  );

  // Стабильная ссылка — объект можно класть в зависимости эффектов.
  return useMemo(() => ({ full, short }), [full, short]);
}
