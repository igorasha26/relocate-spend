import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '@/shared/api';
import { analytics } from '@/shared/analytics';
import { routes } from '@/shared/config/routes';
import { useI18n, type TranslationKey } from '@/shared/i18n';
import { Button, TextInput } from '@/shared/ui';
import { authErrorKey, authFormStyles as styles, CodeInput, isValidEmail, MIN_PASSWORD, PasswordInput } from '@/features/auth';
import { AuthShell, withEmail } from './AuthShell';
import { useAuthDone } from './useAuthDone';

/**
 * Регистрация. Если в Supabase включено подтверждение почты — второй шаг с кодом из письма.
 * Траты, уже записанные на телефоне, после входа уходят в аккаунт (см. store/sync).
 */
export function SignupPage() {
  const { t } = useI18n();
  const done = useAuthDone();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'form' | 'code'>('form');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => analytics.track('signup_opened'), []);

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
    if (password.length < MIN_PASSWORD) return setError('auth.errors.shortPassword');
    void run(async () => {
      const session = await auth.signUp(email.trim(), password);
      if (session) done('signup_completed', 'auth.created');
      else {
        analytics.track('signup_code_sent');
        setStep('code');
      }
    });
  };

  const verify = (e: FormEvent) => {
    e.preventDefault();
    if (code.length < 6) return setError('auth.errors.invalidCode');
    void run(async () => {
      await auth.verifyCode(email.trim(), code, 'email');
      done('signup_completed', 'auth.created');
    });
  };

  if (step === 'code') {
    return (
      <AuthShell title={t('auth.codeTitle')} lead={withEmail(t('auth.codeText'), email.trim())} onBack={() => setStep('form')}>
        <form className={styles.form} onSubmit={verify} noValidate>
          <CodeInput value={code} onChange={setCode} onResend={() => auth.resendSignupCode(email.trim())} autoFocus />
          {error && <p className={styles.error} role="alert">{t(error)}</p>}
          <div className={styles.actions}>
            <Button type="submit" disabled={busy} className={busy ? styles.busy : undefined}>
              {t('auth.confirm')}
            </Button>
            <button type="button" className={styles.link} onClick={() => setStep('form')}>
              {t('auth.changeEmail')}
            </button>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('auth.signupTitle')} lead={t('auth.signupSubtitle')}>
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
          autoComplete="new-password"
          placeholder={t('auth.passwordPlaceholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className={styles.error} role="alert">{t(error)}</p>}
        <div className={styles.actions}>
          <Button type="submit" disabled={busy} className={busy ? styles.busy : undefined}>
            {t('auth.signup')}
          </Button>
          <p className={styles.consent}>
            {t('auth.consent')} <Link to={routes.privacy}>{t('auth.consentLink')}</Link>
          </p>
          <p className={styles.row}>
            {t('auth.haveAccount')}
            <Link to={routes.login} replace className={styles.link}>
              {t('auth.toLogin')}
            </Link>
          </p>
        </div>
      </form>
    </AuthShell>
  );
}
