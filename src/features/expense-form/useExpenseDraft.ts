import { useCallback, useState } from 'react';
import type { ExpenseDraft } from './model';

/** Состояние формы расхода. Все обновления иммутабельные. */
export function useExpenseDraft(initial: ExpenseDraft | (() => ExpenseDraft)) {
  const [draft, setDraft] = useState<ExpenseDraft>(initial);

  const set = useCallback(<K extends keyof ExpenseDraft>(key: K, value: ExpenseDraft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
  }, []);

  return { draft, setDraft, set };
}
