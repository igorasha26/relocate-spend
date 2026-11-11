import { useI18n, type TranslationKey } from '@/shared/i18n';
import { Button, Icon, Sheet, useToast, type IconName } from '@/shared/ui';
import { useInstallEvent } from './installEvent';
import styles from './InstallSheet.module.css';
import { detectPlatform, type InstallPlatform } from './platform';

interface Step {
  icon: IconName;
  title: TranslationKey;
  text: TranslationKey;
}

const STEPS: Record<InstallPlatform, Step[]> = {
  'ios-safari': [
    { icon: 'share', title: 'install.iosShareTitle', text: 'install.iosShareText' },
    { icon: 'plusSquare', title: 'install.iosAddTitle', text: 'install.iosAddText' },
    { icon: 'check', title: 'install.iosConfirmTitle', text: 'install.iosConfirmText' },
  ],
  'ios-other': [
    { icon: 'share', title: 'install.iosShareTitle', text: 'install.iosOtherShareText' },
    { icon: 'plusSquare', title: 'install.iosAddTitle', text: 'install.iosAddText' },
    { icon: 'check', title: 'install.iosConfirmTitle', text: 'install.iosConfirmText' },
  ],
  android: [
    { icon: 'moreVertical', title: 'install.androidMenuTitle', text: 'install.androidMenuText' },
    { icon: 'smartphone', title: 'install.androidAddTitle', text: 'install.androidAddText' },
    { icon: 'check', title: 'install.androidConfirmTitle', text: 'install.androidConfirmText' },
  ],
  desktop: [{ icon: 'download', title: 'install.desktopTitle', text: 'install.desktopText' }],
};

interface Props {
  open: boolean;
  onClose: () => void;
  /** Для проверки вёрстки — по умолчанию определяется по браузеру. */
  platform?: InstallPlatform;
}

/**
 * Инструкция «Добавить на главный экран» под устройство пользователя.
 * Если браузер умеет устанавливать сам (Chrome на Android) — одна кнопка «Установить».
 */
export function InstallSheet({ open, onClose, platform = detectPlatform() }: Props) {
  const { t } = useI18n();
  const toast = useToast();
  const { canInstall, install } = useInstallEvent();
  const steps = STEPS[platform];

  const onInstall = async () => {
    const accepted = await install();
    if (accepted) toast(t('install.installed'));
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('install.title')}
      closeLabel={t('common.close')}
      footer={
        canInstall ? (
          <Button icon="download" onClick={onInstall}>
            {t('install.install')}
          </Button>
        ) : (
          <Button onClick={onClose}>{t('install.done')}</Button>
        )
      }
    >
      <div className={styles.hero}>
        <img className={styles.appIcon} src={`${import.meta.env.BASE_URL}apple-touch-icon.png`} alt="" width={64} height={64} />
        <p className={styles.subtitle}>{t('install.subtitle')}</p>
      </div>

      {canInstall ? (
        <p className={styles.note}>{t('install.oneTap')}</p>
      ) : (
        <>
          {platform === 'ios-other' && <p className={styles.note}>{t('install.iosOtherNote')}</p>}
          <ol className={styles.steps}>
            {steps.map((step, index) => (
              <li key={step.title} className={styles.step}>
                <span className={styles.number}>{index + 1}</span>
                <span className={styles.text}>
                  <span className={styles.stepTitle}>{t(step.title)}</span>
                  <span className={styles.stepText}>{t(step.text)}</span>
                </span>
                <span className={styles.icon} aria-hidden>
                  <Icon name={step.icon} size={22} strokeWidth={2} />
                </span>
              </li>
            ))}
          </ol>
          {platform === 'ios-safari' && (
            // Стрелка к кнопке «Поделиться», которая на iPhone внизу по центру
            <div className={styles.pointer} aria-hidden>
              <Icon name="chevronDown" size={22} strokeWidth={2.4} />
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
