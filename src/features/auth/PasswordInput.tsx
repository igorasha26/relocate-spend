import { useState, type InputHTMLAttributes } from 'react';
import { useI18n } from '@/shared/i18n';
import { Icon, TextInput } from '@/shared/ui';
import styles from './AuthForm.module.css';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

/** Поле пароля с кнопкой «показать» — на телефоне легко ошибиться в символе. */
export function PasswordInput({ label, ...rest }: Props) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <TextInput
      label={label}
      type={visible ? 'text' : 'password'}
      leadingIcon="lock"
      autoCapitalize="none"
      autoCorrect="off"
      spellCheck={false}
      trailing={
        <button
          type="button"
          className={styles.eye}
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('auth.hidePassword') : t('auth.showPassword')}
          aria-pressed={visible}
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={20} />
        </button>
      }
      {...rest}
    />
  );
}
