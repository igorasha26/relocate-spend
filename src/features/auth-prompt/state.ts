import { useSyncExternalStore } from 'react';

/**
 * Плашка «Сохраните траты в аккаунте» показывается гостю при каждом запуске приложения
 * (один раз за запуск: перезагрузка страницы не считается новым запуском).
 */
const SESSION_KEY = 'relocate-spend:auth-prompt-shown';
const listeners = new Set<() => void>();

function read(): boolean {
  try {
    return sessionStorage.getItem(SESSION_KEY) === '1';
  } catch {
    return false;
  }
}

let handled = read();

/** Плашку уже показали в этом запуске (или она не нужна) — можно показывать следующие окна. */
export function markAuthPromptHandled() {
  handled = true;
  try {
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* не критично */
  }
  listeners.forEach((l) => l());
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useAuthPromptHandled(): boolean {
  return useSyncExternalStore(subscribe, () => handled, () => true);
}
