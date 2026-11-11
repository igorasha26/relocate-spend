import { useSyncExternalStore } from 'react';

/** Событие Chrome/Edge на Android и десктопе: позволяет показать системное окно установки. */
export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

// Слушаем с самого старта: событие приходит один раз и рано
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault(); // своё окно вместо мини-баннера браузера
    deferred = event as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    notify();
  });
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Можно ли установить одной кнопкой (системное окно браузера). */
export function useInstallEvent() {
  const event = useSyncExternalStore(subscribe, () => deferred, () => null);
  const install = async (): Promise<boolean> => {
    if (!event) return false;
    await event.prompt();
    const { outcome } = await event.userChoice;
    deferred = null;
    notify();
    return outcome === 'accepted';
  };
  return { canInstall: event !== null, install };
}
