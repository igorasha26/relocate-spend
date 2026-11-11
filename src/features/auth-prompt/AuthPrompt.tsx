import { useI18n } from '@/shared/i18n';
import { Button, Icon, Sheet, type IconName } from '@/shared/ui';
import styles from './AuthPrompt.module.css';

interface Props {
  open: boolean;
  onSignup: () => void;
  onLogin: () => void;
  onSkip: () => void;
}

const BENEFITS: { icon: IconName; key: 'auth.promptB1' | 'auth.promptB2' | 'auth.promptB3' }[] = [
  { icon: 'cloud', key: 'auth.promptB1' },
  { icon: 'smartphone', key: 'auth.promptB2' },
  { icon: 'upload', key: 'auth.promptB3' },
];

/** «Сохраните траты в аккаунте»: регистрация, вход или «Продолжить без регистрации». */
export function AuthPrompt({ open, onSignup, onLogin, onSkip }: Props) {
  const { t } = useI18n();
  return (
    <Sheet
      open={open}
      onClose={onSkip}
      title={t('auth.promptTitle')}
      closeLabel={t('common.close')}
      footer={
        <div className={styles.footer}>
          <Button icon="cloud" onClick={onSignup}>
            {t('auth.signup')}
          </Button>
          <p className={styles.note}>{t('auth.promptNote')}</p>
          <div className={styles.links}>
            <button type="button" className={styles.link} onClick={onLogin}>
              {t('auth.promptLogin')}
            </button>
            <button type="button" className={styles.skip} onClick={onSkip}>
              {t('auth.promptSkip')}
            </button>
          </div>
        </div>
      }
    >
      <ul className={styles.list}>
        {BENEFITS.map((b) => (
          <li key={b.key} className={styles.item}>
            <span className={styles.icon}>
              <Icon name={b.icon} size={20} />
            </span>
            <span>{t(b.key)}</span>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
