import { useEffect, useRef } from 'react';
import { analytics } from '@/shared/analytics';
import { useSession } from '@/shared/api';
import { refreshRemoteConfig } from '@/shared/config/features';
import { refreshRates } from '@/shared/lib/rates';
import { useAppState } from '@/store';

/**
 * Фоновые задачи уровня приложения:
 * - событие «приложение открыто» со сводкой (сколько трат, вошёл ли) — основа для отчётов об активности;
 * - флаги функций из базы — при запуске и при возвращении в приложение.
 */
export function useAppLifecycle() {
  const { status, expenses, categories, settings } = useAppState();
  const session = useSession();
  const opened = useRef(false);

  useEffect(() => {
    if (status !== 'ready' || opened.current) return;
    opened.current = true;
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    const summary = {
      expenses_count: expenses.length,
      custom_categories: categories.filter((c) => !c.builtIn).length,
      logged_in: Boolean(session),
      base_currency: settings.baseCurrency,
      theme: settings.theme,
      standalone,
    };
    analytics.track('app_opened', summary);
    analytics.setPersonProps({ ...summary, language: settings.language });
  }, [status, expenses, categories, settings, session]);

  useEffect(() => {
    void refreshRemoteConfig(true);
    void refreshRates(); // курсы валют: не чаще раза в 6 часов
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      void refreshRemoteConfig();
      void refreshRates();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
}
