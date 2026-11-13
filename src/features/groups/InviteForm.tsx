import { useState, type FormEvent } from 'react';
import { useI18n, type TranslationKey } from '@/shared/i18n';
import { Button, TextInput, useToast } from '@/shared/ui';
import { groupErrorCode, groupsStore } from '@/store';
import { analytics } from '@/shared/analytics';
import styles from './groups.module.css';

/** Поле почты + «Пригласить». */
export function InviteForm({ groupId, disabled }: { groupId: string; disabled?: boolean }) {
  const { t } = useI18n();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) return setError('groups.errors.invalid_email');
    setBusy(true);
    setError(null);
    try {
      await groupsStore.invite(groupId, mail);
      analytics.track('group_invite_sent');
      toast(t('groups.invited', { email: mail }));
      setEmail('');
    } catch (err) {
      setError(`groups.errors.${groupErrorCode(err)}` as TranslationKey);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className={styles.inviteForm} onSubmit={submit} noValidate>
      <TextInput
        label={t('groups.emailLabel')}
        type="email"
        inputMode="email"
        autoCapitalize="none"
        autoComplete="off"
        leadingIcon="mail"
        placeholder="name@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={disabled}
      />
      {error && (
        <p className={styles.error} role="alert">
          {t(error)}
        </p>
      )}
      <Button type="submit" variant="secondary" icon="plus" disabled={busy || disabled || !email.trim()}>
        {t('groups.invite')}
      </Button>
    </form>
  );
}
