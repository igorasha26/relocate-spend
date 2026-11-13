import { useEffect, useRef } from 'react';
import { ensureRatesFor, getRatesFor, useRatesVersion } from '@/shared/lib/rates';
import { useActions, useAppState } from '@/store';

const MAX_DAYS_PER_RUN = 40;

/**
 * Фоновое уточнение курсов: каждая трата должна считаться по курсу своего дня.
 * 1. Если курс на дату траты уже загружен, а у траты другой — подставляем точный.
 * 2. Дни, которых ещё нет на телефоне, скачиваем (по одному, не больше 40 за раз).
 * Так исправляются траты задним числом, записанные без сети, и старые траты до появления курсов.
 */
export function useRatesBackfill() {
  const { status, expenses } = useAppState();
  const { setExpenseRates } = useActions();
  const ratesVersion = useRatesVersion();
  const running = useRef(false);

  useEffect(() => {
    if (status !== 'ready' || expenses.length === 0) return;
    const timer = setTimeout(() => {
      // 1. Подставить уже известные точные курсы
      const updates = [];
      const missing = new Set<string>();
      for (const e of expenses) {
        const snap = getRatesFor(e.date);
        if (snap.exact && snap.date) {
          if (e.ratesDate !== snap.date || !e.rates) {
            updates.push({ id: e.id, eurRate: snap.rates[e.currency], rates: snap.rates, ratesDate: snap.date });
          }
        } else {
          missing.add(e.date);
        }
      }
      setExpenseRates(updates);

      // 2. Скачать недостающие дни (после загрузки версия курсов изменится и эффект запустится снова)
      if (missing.size === 0 || running.current || navigator.onLine === false) return;
      running.current = true;
      void (async () => {
        try {
          for (const day of [...missing].sort().reverse().slice(0, MAX_DAYS_PER_RUN)) {
            await ensureRatesFor(day as Parameters<typeof ensureRatesFor>[0]);
          }
        } finally {
          running.current = false;
        }
      })();
    }, 1200);
    return () => clearTimeout(timer);
  }, [status, expenses, ratesVersion, setExpenseRates]);
}
