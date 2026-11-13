import { useEffect, useState } from 'react';
import { analytics } from '@/shared/analytics';
import { ApiError, useSession } from '@/shared/api';
import { useI18n } from '@/shared/i18n';
import { Button, Segmented, Sheet, TextArea, TextInput, useToast } from '@/shared/ui';
import { sendFeedback, type FeedbackKind } from './api';
import styles from './FeedbackSheet.module.css';

interface Props {
  open: boolean;
  onClose: () => void;
}

/** «Отзыв или идея»: тип, текст и необязательный контакт для ответа. */
export function FeedbackSheet({ open, onClose }: Props) {
  const { t, language } = useI18n();
  const toast = useToast();
  const session = useSession();
  const [kind, setKind] = useState<FeedbackKind>('idea');
  const [message, setMessage] = useState('');
  const [contact, setContact] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Вошедшему пользователю подставляем почту аккаунта — её можно стереть
  useEffect(() => {
    if (open && session?.user.email) setContact((c) => c || session.user.email);
  }, [open, session]);

  const submit = async () => {
    if (message.trim().length < 3) return setError(t('feedback.empty'));
    setBusy(true);
    setError(null);
    try {
      await sendFeedback({ kind, message, contact, language });
      analytics.track('feedback_sent', { kind });
      toast(t('feedback.sent'));
      setMessage('');
      onClose();
    } catch (e) {
      setError(e instanceof ApiError && /rate limit/i.test(e.message) ? t('feedback.tooMany') : t('feedback.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('feedback.title')}
      subtitle={t('feedback.subtitle')}
      closeLabel={t('common.close')}
      footer={
        <Button onClick={() => void submit()} disabled={busy} icon="message">
          {t('feedback.send')}
        </Button>
      }
    >
      <div className={styles.form}>
        <Segmented<FeedbackKind>
          value={kind}
          onChange={setKind}
          options={[
            { value: 'idea', label: t('feedback.idea') },
            { value: 'bug', label: t('feedback.bug') },
            { value: 'other', label: t('feedback.other') },
          ]}
        />
        <TextArea
          label={t('feedback.message')}
          placeholder={t('feedback.placeholder')}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          maxLength={4000}
        />
        <TextInput
          label={`${t('feedback.contact')} · ${t('common.optional')}`}
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          autoCapitalize="none"
          autoComplete="email"
          placeholder="@telegram"
        />
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
      </div>
    </Sheet>
  );
}
