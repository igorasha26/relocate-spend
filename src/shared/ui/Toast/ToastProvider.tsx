import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { ToastContext } from './context';
import styles from './Toast.module.css';

const DURATION = 2200;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  const show = useCallback((text: string) => {
    window.clearTimeout(timer.current);
    setMessage(text);
    setVisible(true);
    timer.current = window.setTimeout(() => setVisible(false), DURATION);
  }, []);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className={cn(styles.toast, visible && styles.visible)}>
        {message}
      </div>
    </ToastContext.Provider>
  );
}
