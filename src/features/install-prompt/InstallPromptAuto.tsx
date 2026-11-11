import { useEffect, useState } from 'react';
import { analytics } from '@/shared/analytics';
import { InstallSheet } from './InstallSheet';
import { detectPlatform, isStandalone } from './platform';

const SEEN_KEY = 'relocate-spend:install-hint-seen';
const DELAY_MS = 1200;

function alreadySeen(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true; // приватный режим — лучше не надоедать
  }
}

/**
 * Показывает инструкцию по установке один раз — при первом заходе с телефона.
 * Не показывается: если уже открыто с главного экрана, на компьютере, если окно уже закрывали.
 * Повторно открыть можно из профиля.
 */
export function InstallPromptAuto({ enabled = true }: { enabled?: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled || isStandalone() || detectPlatform() === 'desktop' || alreadySeen()) return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      analytics.track('install_prompt_shown', { platform: detectPlatform() });
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(SEEN_KEY, '1');
    } catch {
      /* не критично */
    }
  };

  return <InstallSheet open={open} onClose={close} />;
}
