import { useMemo, type ReactNode } from 'react';
import { createI18n, I18nContext, type Language } from './core';

export function I18nProvider({ language, children }: { language: Language; children: ReactNode }) {
  const value = useMemo(() => createI18n(language), [language]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
