import type { FeatureName } from '@/shared/config/features';
import { routes } from '@/shared/config/routes';
import type { TranslationKey } from '@/shared/i18n';
import type { IconName } from '@/shared/ui';

/**
 * Окно «Что нового». Каждая запись показывается один раз тем, кто уже пользовался приложением.
 * feature — запись появится, только когда функция включена (например, сканер включили в базе —
 * у всех на следующем запуске всплывёт «Теперь можно сканировать чеки»).
 * Новым пользователям не показывается: для них есть обучение.
 */
export interface Release {
  id: string;
  feature?: FeatureName;
  items: { icon: IconName; title: TranslationKey; text: TranslationKey }[];
  /** Кнопка «Попробовать» — куда ведёт. */
  cta?: string;
}

export const RELEASES: Release[] = [
  {
    id: '1.1-account',
    items: [
      { icon: 'cloud', title: 'whatsNew.accountTitle', text: 'whatsNew.accountText' },
      { icon: 'message', title: 'whatsNew.feedbackTitle', text: 'whatsNew.feedbackText' },
    ],
    cta: routes.profile,
  },
  {
    id: 'qr-scan',
    feature: 'qrScan',
    items: [{ icon: 'scan', title: 'whatsNew.scanTitle', text: 'whatsNew.scanText' }],
    cta: routes.scan,
  },
];
