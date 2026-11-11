import { useNavigate } from 'react-router-dom';
import { analytics } from '@/shared/analytics';
import { routes } from '@/shared/config/routes';
import { useI18n, type TranslationKey } from '@/shared/i18n';
import { useToast } from '@/shared/ui';

/** После входа/регистрации: событие в аналитику, тост и возврат в профиль. */
export function useAuthDone() {
  const navigate = useNavigate();
  const toast = useToast();
  const { t } = useI18n();
  return (event: 'login' | 'signup_completed' | 'password_reset', message: TranslationKey) => {
    analytics.track(event);
    toast(t(message));
    navigate(routes.profile, { replace: true });
  };
}
