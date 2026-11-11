import { useSyncExternalStore } from 'react';

const KEY = 'relocate-spend:onboarding-done';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return true; // без хранилища не показываем — иначе обучение было бы при каждом запуске
  }
}

export function markOnboardingDone() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* не критично */
  }
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Пройдено ли обучение (общий флаг — по нему, например, откладывается подсказка установки). */
export function useOnboardingDone(): boolean {
  return useSyncExternalStore(subscribe, read, () => true);
}
