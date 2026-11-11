import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { analytics } from '@/shared/analytics';
import { useSession } from '@/shared/api';
import { HAS_BACKEND } from '@/shared/config/env';
import { routes } from '@/shared/config/routes';
import { AuthPrompt } from './AuthPrompt';
import { markAuthPromptHandled, useAuthPromptHandled } from './state';

const DELAY_MS = 700;

/**
 * Показывает гостю предложение зарегистрироваться при каждом запуске.
 * enabled — когда на экране нет других окон (обучение уже пройдено, открыт обычный экран).
 */
export function AuthPromptAuto({ enabled }: { enabled: boolean }) {
  const navigate = useNavigate();
  const session = useSession();
  const handled = useAuthPromptHandled();
  const [open, setOpen] = useState(false);
  const needed = HAS_BACKEND && !session && !handled;

  // Вошедшему пользователю или без базы плашка не нужна — сразу пропускаем очередь дальше
  useEffect(() => {
    if (!handled && (!HAS_BACKEND || session)) markAuthPromptHandled();
  }, [handled, session]);

  useEffect(() => {
    if (!enabled || !needed) return;
    const timer = window.setTimeout(() => {
      setOpen(true);
      analytics.track('auth_prompt_shown');
    }, DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [enabled, needed]);

  const finish = (choice: 'signup' | 'login' | 'skip') => {
    analytics.track('auth_prompt_choice', { choice });
    setOpen(false);
    markAuthPromptHandled();
    if (choice !== 'skip') navigate(choice === 'signup' ? routes.signup : routes.login);
  };

  return (
    <AuthPrompt
      open={open}
      onSignup={() => finish('signup')}
      onLogin={() => finish('login')}
      onSkip={() => finish('skip')}
    />
  );
}
