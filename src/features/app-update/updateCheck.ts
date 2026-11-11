import { useSyncExternalStore } from 'react';
import { ENV } from '@/shared/config/env';

/**
 * Проверка новой версии. При сборке рядом с приложением кладётся version.json с номером сборки;
 * открытое приложение время от времени запрашивает его и, если номер другой, показывает плашку
 * «Доступна новая версия». Так обновление доходит даже до тех, кто неделями не закрывает вкладку.
 */
const CHECK_EVERY_MS = 15 * 60 * 1000;
const MIN_GAP_MS = 60 * 1000;

let available = false;
let lastCheck = 0;
const listeners = new Set<() => void>();

async function check() {
  if (!import.meta.env.PROD || Date.now() - lastCheck < MIN_GAP_MS || available) return;
  lastCheck = Date.now();
  try {
    const response = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return;
    const { buildId } = (await response.json()) as { buildId?: string };
    if (buildId && buildId !== ENV.buildId) {
      available = true;
      listeners.forEach((l) => l());
    }
  } catch {
    /* офлайн */
  }
}

let started = false;

/** Регистрация service worker и фоновые проверки обновлений. Вызывается один раз в main.tsx. */
export function startUpdateChecks() {
  if (started || !import.meta.env.PROD) return;
  started = true;
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
        console.warn('[sw] registration failed', error);
      });
    });
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void check();
  });
  setInterval(() => document.visibilityState === 'visible' && void check(), CHECK_EVERY_MS);
  setTimeout(() => void check(), 10_000);
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function useUpdateAvailable(): boolean {
  return useSyncExternalStore(subscribe, () => available, () => false);
}

/** Для проверок в браузере: window.__simulateUpdate() */
export function simulateUpdate() {
  available = true;
  listeners.forEach((l) => l());
}
