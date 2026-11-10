import { createContext } from 'react';
import { createFormatters, type Formatters } from './format';
import { en } from './locales/en';
import { ru, type Dictionary } from './locales/ru';
import { sr } from './locales/sr';

export const LANGUAGES = ['ru', 'en', 'sr'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_META: Record<Language, { locale: string; nativeName: string; englishName: string }> = {
  ru: { locale: 'ru-RU', nativeName: 'Русский', englishName: 'Russian' },
  en: { locale: 'en-GB', nativeName: 'English', englishName: 'English' },
  sr: { locale: 'sr-Latn-RS', nativeName: 'Srpski', englishName: 'Serbian' },
};

const DICTIONARIES: Record<Language, Dictionary> = { ru, en, sr };

type PluralForms = { one: string; few: string; many: string; other: string };

/** Все пути к строковым листьям словаря: 'home.title' | 'form.save' | … */
type StringPaths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? `${P}${K}`
    : T[K] extends PluralForms
      ? never
      : StringPaths<T[K], `${P}${K}.`>;
}[keyof T & string];

type PluralPaths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? never
    : T[K] extends PluralForms
      ? `${P}${K}`
      : PluralPaths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type TranslationKey = StringPaths<Dictionary>;
export type PluralKey = PluralPaths<Dictionary>;
export type Params = Record<string, string | number>;

function lookup(dict: Dictionary, path: string): unknown {
  return path.split('.').reduce<unknown>((node, key) => {
    if (node && typeof node === 'object') return (node as Record<string, unknown>)[key];
    return undefined;
  }, dict);
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export interface I18n {
  language: Language;
  t: (key: TranslationKey, params?: Params) => string;
  tp: (key: PluralKey, count: number, params?: Params) => string;
  /** Для ключей, собранных динамически (например, имена стандартных категорий). */
  tDynamic: (key: string, fallback: string) => string;
  fmt: Formatters;
}

export const I18nContext = createContext<I18n | null>(null);

export function createI18n(language: Language): I18n {
  const dict = DICTIONARIES[language];
  const { locale } = LANGUAGE_META[language];
  const rules = new Intl.PluralRules(locale);

  const t: I18n['t'] = (key, params) => {
    const value = lookup(dict, key) ?? lookup(ru, key);
    return typeof value === 'string' ? interpolate(value, params) : key;
  };

  const tp: I18n['tp'] = (key, count, params) => {
    const forms = lookup(dict, key) as PluralForms | undefined;
    if (!forms) return String(count);
    const category = rules.select(count) as keyof PluralForms;
    const template = forms[category] ?? forms.other;
    return interpolate(template, { count, ...params });
  };

  const tDynamic: I18n['tDynamic'] = (key, fallback) => {
    const value = lookup(dict, key);
    return typeof value === 'string' ? value : fallback;
  };

  return { language, t, tp, tDynamic, fmt: createFormatters(locale) };
}

