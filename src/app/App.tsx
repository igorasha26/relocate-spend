import type { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { StoreProvider, useSettings } from '@/store';
import { I18nProvider } from '@/shared/i18n';
import { ToastProvider } from '@/shared/ui';
import { ErrorBoundary } from './ErrorBoundary';
import { AppLayout } from './layout/AppLayout';
import { useApplyDocumentSettings } from './useApplyTheme';

/** Связывает настройки из store с i18n и темой документа. */
function SettingsBridge({ children }: { children: ReactNode }) {
  const { theme, language } = useSettings();
  useApplyDocumentSettings(theme, language);
  return <I18nProvider language={language}>{children}</I18nProvider>;
}

export function App() {
  return (
    <ErrorBoundary>
      <StoreProvider>
        <SettingsBridge>
          <ToastProvider>
            <BrowserRouter basename={import.meta.env.BASE_URL}>
              <AppLayout />
            </BrowserRouter>
          </ToastProvider>
        </SettingsBridge>
      </StoreProvider>
    </ErrorBoundary>
  );
}
