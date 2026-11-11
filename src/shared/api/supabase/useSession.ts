import { useSyncExternalStore } from 'react';
import { auth, type Session } from './auth';

/** Текущая сессия (null — гость). Компонент перерисуется при входе/выходе. */
export function useSession(): Session | null {
  return useSyncExternalStore(auth.subscribe, auth.getSession, () => null);
}
