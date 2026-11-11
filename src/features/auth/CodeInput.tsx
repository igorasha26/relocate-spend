import { useEffect, useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { TextInput } from '@/shared/ui';
import styles from './AuthForm.module.css';

interface Props {
  value: string;
  onChange: (code: string) => void;
  /** Отправить код ещё раз; кнопка доступна раз в минуту. */
  onResend: () => Promise<unknown>;
  autoFocus?: boolean;
}

const COOLDOWN = 60;

/** Поле для кода из письма + «Отправить ещё раз» с таймером. */
export function CodeInput({ value, onChange, onResend, autoFocus }: Props) {
  const { t } = useI18n();
  const [left, setLeft] = useState(COOLDOWN);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (left <= 0) return;
    const timer = setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [left]);

  const resend = async () => {
    setLeft(COOLDOWN);
    setSent(false);
    try {
      await onResend();
      setSent(true);
    } catch {
      setLeft(0);
    }
  };

  return (
    <div className={styles.code}>
      <TextInput
        label={t('auth.code')}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 10))}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="••••••"
        autoFocus={autoFocus}
        className={styles.codeField}
      />
      <button type="button" className={styles.link} disabled={left > 0} onClick={() => void resend()}>
        {left > 0 ? (sent ? `${t('auth.resent')} · ` : '') + t('auth.resendIn', { seconds: left }) : t('auth.resend')}
      </button>
    </div>
  );
}
