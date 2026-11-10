import { useLayoutEffect } from 'react';
import type { ThemePreference } from '@/store';
import { useSystemColorScheme } from '@/shared/hooks/useColorScheme';
import { LANGUAGE_META, type Language } from '@/shared/i18n';

const THEME_COLOR = { light: '#F5F7F6', dark: '#000000' } as const;

/** Применяет тему и язык к <html>: data-theme, lang, цвет статус-бара. */
export function useApplyDocumentSettings(theme: ThemePreference, language: Language) {
  const system = useSystemColorScheme();
  const resolved = theme === 'system' ? system : theme;

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = resolved;
    root.lang = LANGUAGE_META[language].locale.slice(0, 2);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[resolved]);
  }, [resolved, language]);
}
