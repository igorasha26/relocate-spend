import { useContext } from 'react';
import { I18nContext, type I18n } from './core';

export { I18nProvider } from './I18nProvider';
export { LANGUAGES, LANGUAGE_META } from './core';
export type { Language, TranslationKey, PluralKey, I18n } from './core';

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}
