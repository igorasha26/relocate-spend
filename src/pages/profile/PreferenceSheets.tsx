import { CurrencySheet } from '@/features/currency-picker';
import { useActions, useSettings, type ThemePreference } from '@/store';
import { LANGUAGE_META, LANGUAGES, useI18n, type Language } from '@/shared/i18n';
import { OptionList, Sheet } from '@/shared/ui';
import styles from './ProfilePage.module.css';

export type PreferenceSheet = 'currency' | 'language' | 'theme' | null;

/** UI 18 (язык), UI 19 (оформление), UI 20 (базовая валюта). Выбор применяется сразу по нажатию. */
export function PreferenceSheets({ open, onClose }: { open: PreferenceSheet; onClose: () => void }) {
  const { t } = useI18n();
  const settings = useSettings();
  const { updateSettings } = useActions();

  return (
    <>
      <CurrencySheet
        open={open === 'currency'}
        value={settings.baseCurrency}
        title={t('profile.baseCurrency')}
        subtitle={t('profile.baseCurrencySubtitle')}
        note={t('profile.baseCurrencyNote')}
        onClose={onClose}
        onSubmit={(baseCurrency) => {
          updateSettings({ baseCurrency });
          onClose();
        }}
      />

      <Sheet
        open={open === 'language'}
        onClose={onClose}
        title={t('profile.languageTitle')}
        subtitle={t('profile.languageSubtitle')}
        closeLabel={t('common.close')}
      >
        <OptionList<Language>
          selected={settings.language}
          onSelect={(language) => {
            updateSettings({ language });
            onClose();
          }}
          options={LANGUAGES.map((code) => ({
            value: code,
            title: LANGUAGE_META[code].nativeName,
            // Как в макете: «Русский — Russian», «English — Английский»
            subtitle: code === settings.language ? LANGUAGE_META[code].englishName : t(`languages.${code}`),
          }))}
        />
      </Sheet>

      <Sheet
        open={open === 'theme'}
        onClose={onClose}
        title={t('profile.themeTitle')}
        subtitle={t('profile.themeSubtitle')}
        closeLabel={t('common.close')}
      >
        <OptionList<ThemePreference>
          selected={settings.theme}
          onSelect={(theme) => {
            updateSettings({ theme });
            onClose();
          }}
          options={[
            { value: 'light', title: t('profile.themeLight'), subtitle: t('profile.themeLightHint') },
            { value: 'dark', title: t('profile.themeDark'), subtitle: t('profile.themeDarkHint') },
            { value: 'system', title: t('profile.themeSystem'), subtitle: t('profile.themeSystemHint') },
          ]}
        />
        <p className={styles.sheetNote}>{t('profile.themeNote')}</p>
      </Sheet>
    </>
  );
}
