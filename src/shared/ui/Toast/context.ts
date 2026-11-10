import { createContext, useContext } from 'react';

export const ToastContext = createContext<((message: string) => void) | null>(null);

/** Короткое уведомление внизу экрана: toast('Трата сохранена'). */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
