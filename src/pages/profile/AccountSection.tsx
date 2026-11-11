import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSession } from '@/shared/api';
import { HAS_BACKEND } from '@/shared/config/env';
import { routes } from '@/shared/config/routes';
import { LANGUAGE_META, useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { AlertDialog, Button, Icon, ListGroup, ListRow, SectionLabel, useToast } from '@/shared/ui';
import { useSettings, useSync } from '@/store';
import styles from './ProfilePage.module.css';

/**
 * Карточка аккаунта в профиле:
 * гость — предложение создать аккаунт; вошёл — почта и статус синхронизации, выход и удаление.
 */
export function AccountSection() {
  const { t, fmt, language } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const session = useSession();
  const settings = useSettings();
  const sync = useSync();
  const [dialog, setDialog] = useState<'logout' | 'delete' | null>(null);
  const [pending, setPending] = useState(false);

  // База не подключена (локальная сборка) — как раньше: профиль на устройстве
  if (!HAS_BACKEND || !session) {
    return (
      <section className={styles.account}>
        <span className={styles.accountIcon}>
          <Icon name="user" size={22} />
        </span>
        <div className={styles.accountText}>
          <p className={styles.accountTitle}>{t('account.guestTitle')}</p>
          <p className={styles.accountSince}>{t('profile.since', { date: fmt.dayMonthYear(settings.createdAt) })}</p>
        </div>
        {HAS_BACKEND ? (
          <>
            <p className={styles.accountNote}>{t('account.guestText')}</p>
            <Button className={styles.accountCta} icon="cloud" onClick={() => navigate(routes.signup)}>
              {t('account.guestCta')}
            </Button>
          </>
        ) : (
          <p className={styles.saved}>
            <span className={styles.savedDot} aria-hidden />
            {t('profile.saved')}
          </p>
        )}
      </section>
    );
  }

  const time = sync.lastSyncedAt
    ? new Intl.DateTimeFormat(LANGUAGE_META[language].locale, { hour: '2-digit', minute: '2-digit' }).format(sync.lastSyncedAt)
    : null;
  const statusText = {
    off: t('account.synced'),
    syncing: t('account.syncing'),
    synced: time ? t('account.syncedAt', { time }) : t('account.synced'),
    offline: t('account.offline'),
    error: t('account.error'),
  }[sync.status];

  const openLogout = () => {
    setPending(sync.hasPending());
    setDialog('logout');
  };

  const logout = async () => {
    setDialog(null);
    await sync.signOut();
    toast(t('account.loggedOut'));
  };

  const remove = async () => {
    setDialog(null);
    try {
      await sync.deleteAccount();
      toast(t('account.deleted'));
    } catch {
      toast(t('account.deleteFailed'));
    }
  };

  return (
    <>
      <section className={styles.account}>
        <span className={styles.accountIcon}>
          <Icon name={sync.status === 'offline' || sync.status === 'error' ? 'cloudOff' : 'cloud'} size={22} />
        </span>
        <div className={styles.accountText}>
          <p className={cn(styles.accountTitle, styles.email)}>{session.user.email}</p>
          <p className={styles.accountSince}>{t('profile.since', { date: fmt.dayMonthYear(settings.createdAt) })}</p>
        </div>
        <p className={styles.saved} role="status">
          <span className={cn(styles.savedDot, styles[`dot_${sync.status}`])} aria-hidden />
          {statusText}
          {sync.status === 'error' && (
            <button type="button" className={styles.retry} onClick={() => void sync.syncNow()}>
              {t('account.retry')}
            </button>
          )}
        </p>
      </section>

      <section>
        <SectionLabel>{t('account.section')}</SectionLabel>
        <ListGroup>
          <ListRow leading={<Icon name="logout" />} title={t('account.logout')} onClick={openLogout} />
          <ListRow leading={<Icon name="trash" />} title={t('account.delete')} tone="danger" onClick={() => setDialog('delete')} />
        </ListGroup>
      </section>

      <AlertDialog
        open={dialog === 'logout'}
        onClose={() => setDialog(null)}
        title={t('account.logoutTitle')}
        message={pending ? t('account.logoutPending') : t('account.logoutText')}
        actions={[
          { label: t('common.cancel'), onClick: () => setDialog(null) },
          { label: t('account.logout'), onClick: () => void logout(), tone: 'danger' },
        ]}
      />
      <AlertDialog
        open={dialog === 'delete'}
        onClose={() => setDialog(null)}
        title={t('account.deleteTitle')}
        message={t('account.deleteText')}
        actions={[
          { label: t('common.cancel'), onClick: () => setDialog(null) },
          { label: t('account.deleteConfirm'), onClick: () => void remove(), tone: 'danger' },
        ]}
      />
    </>
  );
}
