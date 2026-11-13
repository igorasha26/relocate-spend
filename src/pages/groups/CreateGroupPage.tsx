import { useMemo, useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { ExpensePicker, InviteForm, MemberPill } from '@/features/groups';
import { analytics } from '@/shared/analytics';
import { useSession } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useI18n, type TranslationKey } from '@/shared/i18n';
import { Button, Page, PageHeader, TextInput, useToast } from '@/shared/ui';
import { groupErrorCode, groupsStore, MAX_GROUP_MEMBERS, useActions, useAppState, useGroups, useSync } from '@/store';
import styles from './GroupPages.module.css';

/**
 * Создание группы в 3 шага: название → перенос уже записанных трат («Выбрать все») → приглашения.
 * Шаги 2 и 3 можно пропустить.
 */
export function CreateGroupPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const session = useSession();
  const { expenses } = useAppState();
  const { moveExpenses } = useActions();
  const sync = useSync();
  const { groups } = useGroups();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [name, setName] = useState('');
  const [groupId, setGroupId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<TranslationKey | null>(null);
  const [busy, setBusy] = useState(false);
  const personal = useMemo(() => expenses.filter((e) => !e.groupId), [expenses]);
  const group = groups.find((g) => g.id === groupId);

  if (!session) return <Navigate to={routes.signup} replace />;

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const id = await groupsStore.createGroup(name);
      analytics.track('group_created');
      setGroupId(id);
      setStep(2);
    } catch (err) {
      setError(`groups.errors.${groupErrorCode(err)}` as TranslationKey);
    } finally {
      setBusy(false);
    }
  };

  const move = () => {
    if (!groupId || selected.size === 0) return;
    moveExpenses([...selected], groupId);
    toast(t('groups.moved', { count: selected.size }));
    void sync.refreshGroups();
    setStep(3);
  };

  const finish = () => {
    void sync.refreshGroups();
    if (groupId) navigate(routes.group(groupId), { replace: true });
  };

  const back = () => (step === 1 ? navigate(-1) : finish());
  const stepLabel = <p className={styles.step}>{t('groups.step', { n: step })}</p>;

  if (step === 1) {
    return (
      <Page>
        <PageHeader title={t('groups.newTitle')} onBack={back} />
        <form className={styles.stack} onSubmit={create} noValidate>
          {stepLabel}
          <p className={styles.lead}>{t('groups.nameLead')}</p>
          <TextInput
            label={t('groups.nameLabel')}
            placeholder={t('groups.namePlaceholderGroup')}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          {error && <p role="alert">{t(error)}</p>}
          <Button type="submit" disabled={busy || !name.trim()}>
            {t('groups.next')}
          </Button>
        </form>
      </Page>
    );
  }

  if (step === 2) {
    return (
      <Page>
        <PageHeader title={name.trim()} onBack={back} />
        <div className={styles.stack}>
          {stepLabel}
          <h2>{t('groups.moveTitle')}</h2>
          <p className={styles.lead}>{t('groups.moveLead')}</p>
          <ExpensePicker expenses={personal} selected={selected} onChange={setSelected} />
        </div>
        <div className={styles.footer}>
          <Button icon="users" onClick={move} disabled={selected.size === 0}>
            {t('groups.moveCount', { count: selected.size })}
          </Button>
          <Button variant="secondary" onClick={() => setStep(3)}>
            {t('groups.skip')}
          </Button>
        </div>
      </Page>
    );
  }

  const taken = (group?.members.length ?? 1) + (group?.invites.length ?? 0);
  return (
    <Page>
      <PageHeader title={name.trim()} onBack={back} />
      <div className={styles.stack}>
        {stepLabel}
        <h2>{t('groups.inviteTitle')}</h2>
        <p className={styles.lead}>{t('groups.inviteLead')}</p>
        {groupId && <InviteForm groupId={groupId} disabled={taken >= MAX_GROUP_MEMBERS} />}
        {group && (
          <div className={styles.members}>
            {group.members.map((m) => (
              <MemberPill key={m.id} id={m.id} name={m.name} you={m.id === session.user.id ? t('groups.you') : undefined} />
            ))}
            {group.invites.map((i) => (
              <span key={i.id} className={styles.pending}>
                {i.email} · {t('groups.pending')}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className={styles.footer}>
        <Button onClick={finish}>{t('groups.done')}</Button>
      </div>
    </Page>
  );
}
