import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { auth } from '@/shared/api';
import { useI18n, type TranslationKey } from '@/shared/i18n';
import { Button, TextInput } from '@/shared/ui';
import {
  authErrorKey,
  authFormStyles as styles,
  CodeInput,
  isValidEmail,
  MIN_PASSWORD,
  PasswordInput,
  useCaptcha,
} from '@/features/auth';
import { AuthShell, withEmail } from './AuthShell';
import { useAuthDone } from './useAuthDone';

/** Сброс пароля: почта → код из письма + новый пароль (без перехода по ссылке). */
export function ResetPasswordPage() {
  const { t } = useI18n();
  const done = useAuthDone();
  const location = useLocation();
  const [email, setEmail] = useState(() => (location.state as { email?: string } | null)?.email ?? '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);
  const captcha = useCaptcha();

  /** Запрос с капчей: токен одноразовый, после запроса сбрасываем. */
  const withCaptcha = async <T,>(fn: (token: string | undefined) => Promise<T>) => {
    try {
      return await fn(await captcha.token());
    } finally {
      captcha.reset();
    }
  };

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(authErrorKey(e));
    } finally {
      setBusy(false);
    }
  };

  const sendCode = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return setError('auth.errors.invalidEmail');
    void run(async () => {
      await withCaptcha((token) => auth.sendRecoveryCode(email.trim(), token));
      setStep('code');
    });
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return setError('auth.errors.invalidCode');
    if (password.length < MIN_PASSWORD) return setError('auth.errors.shortPassword');
    void run(async () => {
      await auth.verifyCode(email.trim(), code, 'recovery');
      await auth.updatePassword(password);
      done('password_reset', 'auth.passwordUpdated');
    });
  };

  if (step === 'code') {
    return (
      <AuthShell title={t('auth.resetTitle')} lead={withEmail(t('auth.resetCodeText'), email.trim())} onBack={() => setStep('email')}>
        <form className={styles.form} onSubmit={save} noValidate>
          <CodeInput
            value={code}
            onChange={setCode}
            onResend={() => withCaptcha((token) => auth.sendRecoveryCode(email.trim(), token))}
            autoFocus
          />
          {captcha.node}
          <PasswordInput
            label={t('auth.newPassword')}
            autoComplete="new-password"
            placeholder={t('auth.passwordPlaceholder')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className={styles.error} role="alert">{t(error)}</p>}
          <Button type="submit" disabled={busy} className={busy ? styles.busy : undefined}>
            {t('auth.savePassword')}
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.resetTitle')} lead={t('auth.resetText')}>
      <form className={styles.form} onSubmit={sendCode} noValidate>
        <TextInput
          label={t('auth.email')}
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          leadingIcon="mail"
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
        />
        {captcha.node}
        {error && <p className={styles.error} role="alert">{t(error)}</p>}
        <Button type="submit" disabled={busy} className={busy ? styles.busy : undefined}>
          {t('auth.sendCode')}
        </Button>
      </form>
    </AuthShell>
  );
}
