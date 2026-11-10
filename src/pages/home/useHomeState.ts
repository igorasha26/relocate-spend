import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { EMPTY_FILTERS, type ExpenseFilters } from '@/entities/expense';
import { periodFor, type Period } from '@/features/period';
import { useSettings } from '@/store';
import type { Currency } from '@/shared/config/currency';
import { useSessionState } from '@/shared/hooks/useSessionState';

/**
 * UI-состояние главного экрана. Живёт в sessionStorage, чтобы после
 * «Назад» с экрана деталей период, валюта и фильтры не сбрасывались.
 */
export function useHomeState() {
  const { baseCurrency } = useSettings();
  const [period, setPeriod] = useSessionState<Period>('home.period', () => periodFor('month'));
  const [currency, setCurrency] = useSessionState<Currency>('home.currency', baseCurrency);
  const [filters, setFilters] = useSessionState<ExpenseFilters>('home.filters', EMPTY_FILTERS);
  const [params, setParams] = useSearchParams();

  // Переход «Показать расходы категории» приходит как /?category=<id>.
  const categoryParam = params.get('category');
  useEffect(() => {
    if (!categoryParam) return;
    setFilters({ ...EMPTY_FILTERS, categoryIds: [categoryParam] });
    setParams({}, { replace: true });
  }, [categoryParam, setFilters, setParams]);

  return { period, setPeriod, currency, setCurrency, filters, setFilters };
}
