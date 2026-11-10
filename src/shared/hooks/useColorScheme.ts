import { useSyncExternalStore } from 'react';

const query = '(prefers-color-scheme: dark)';

const subscribe = (callback: () => void) => {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
};

/** Системная тема с подпиской на её смену (раньше «Системная» не реагировала на переключение). */
export function useSystemColorScheme(): 'light' | 'dark' {
  return useSyncExternalStore(
    subscribe,
    () => (window.matchMedia(query).matches ? 'dark' : 'light'),
    () => 'light',
  );
}
