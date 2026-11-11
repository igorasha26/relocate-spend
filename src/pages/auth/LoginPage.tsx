import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useI18n, type TranslationKey } from '@/shared/i18n';
import { Button, TextInput } from '@/shared/ui';
import {
  authErrorKey,
  authFormStyles as styles,
  CodeInput,
  isEmailNotConfirmed,
  isValidEmail,
  PasswordInput,
} from '@/features/auth';
import { AuthShell, withEmail } from './AuthShell';
import { useAuthDone } from './useAuthDone';

/** Вход по почте и паролю. Если почта не подтверждена — сразу просим код из письма. */
export function LoginPage() {
  const { t } = useI18n();
  const done = useAuthDone();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);

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

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) return setError('auth.errors.invalidEmail');
    if (!password) return setError('auth.errors.invalidCredentials');
    void run(async () => {
      try {
        await auth.signIn(email.trim(), password);
        done('login', 'auth.welcome');
      } catch (err) {
        if (!isEmailNotConfirmed(err)) throw err;
        await auth.resendSignupCode(email.trim()).catch(() => {});
        setStep('code');
      }
    });
  };

  const verify = (e: FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return setError('auth.errors.invalidCode');
    void run(async () => {
      await auth.verifyCode(email.trim(), code, 'email');
      done('login', 'auth.welcome');
    });
  };

  if (step === 'code') {
    return (
      <AuthShell title={t('auth.codeTitle')} lead={withEmail(t('auth.codeText'), email.trim())} onBack={() => setStep('form')}>
        <form className={styles.form} onSubmit={verify} noValidate>
          <CodeInput value={code} onChange={setCode} onResend={() => auth.resendSignupCode(email.trim())} autoFocus />
          {error && <p className={styles.error} role="alert">{t(error)}</p>}
          <Button type="submit" disabled={busy} className={busy ? styles.busy : undefined}>
            {t('auth.confirm')}
          </Button>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.loginTitle')} lead={t('auth.loginSubtitle')}>
      <form className={styles.form} onSubmit={submit} noValidate>
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
        />
        <PasswordInput
          label={t('auth.password')}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Link to={routes.resetPassword} state={{ email }} className={`${styles.link} ${styles.forgot}`}>
          {t('auth.forgot')}
        </Link>
        {error && <p className={styles.error} role="alert">{t(error)}</p>}
        <div className={styles.actions}>
          <Button type="submit" disabled={busy} className={busy ? styles.busy : undefined}>
            {t('auth.login')}
          </Button>
          <p className={styles.row}>
            {t('auth.noAccount')}
            <Link to={routes.signup} replace className={styles.link}>
              {t('auth.toSignup')}
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
