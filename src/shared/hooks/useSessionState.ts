import { useCallback, useState } from 'react';

const PREFIX = 'relocate-spend:ui:';

function read<T>(key: string, fallback: T): T {
  try {
    const raw = sessionStorage.getItem(PREFIX + key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

/**
 * useState, который переживает переход между экранами в рамках вкладки:
 * выбранный период и режим графика не сбрасываются после «Назад».
 */
export function useSessionState<T>(key: string, initial: T | (() => T)) {
  const [value, setValue] = useState<T>(() =>
    read(key, typeof initial === 'function' ? (initial as () => T)() : initial),
  );

  const update = useCallback(
    (next: T) => {
      setValue(next);
      try {
        sessionStorage.setItem(PREFIX + key, JSON.stringify(next));
      } catch {
        /* приватный режим / переполнение — просто не запоминаем */
      }
    },
    [key],
  );

  return [value, update] as const;
}
