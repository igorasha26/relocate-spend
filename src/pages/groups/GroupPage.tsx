import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { sumIn } from '@/entities/expense';
import { ExpensePicker, InviteForm, LeaveGroupDialog, MemberPill } from '@/features/groups';
import { useSession } from '@/shared/api';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import { Button, ListGroup, ListRow, Icon, Page, PageHeader, SectionLabel, Sheet, useToast } from '@/shared/ui';
import { MAX_GROUP_MEMBERS, useActions, useAppState, useGroups, useSettings, useSync } from '@/store';
import styles from './GroupPages.module.css';

/** Группа трат: сумма, участники, приглашения, перенос трат, выход. */
export function GroupPage() {
  const { id = '' } = useParams();
  const { t, tp, fmt } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const session = useSession();
  const { groups, fresh } = useGroups();
  const { expenses } = useAppState();
  const { baseCurrency } = useSettings();
  const { moveExpenses } = useActions();
  const sync = useSync();
  const [pickOpen, setPickOpen] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const group = groups.find((g) => g.id === id);
  const groupExpenses = useMemo(() => expenses.filter((e) => e.groupId === id), [expenses, id]);
  const personal = useMemo(() => expenses.filter((e) => !e.groupId), [expenses]);

  // Свежие участники и приглашения при открытии (refreshGroups стабилен; объект sync меняется при каждом статусе)
  const { refreshGroups } = sync;
  useEffect(() => {
    void refreshGroups();
  }, [refreshGroups]);

  const back = () => navigate(routes.profile);

  if (!group) {
    return (
      <Page>
        <PageHeader title={t('groups.section')} onBack={back} />
        {fresh && <p className={styles.notFound}>{t('groups.notFound')}</p>}
      </Page>
    );
  }

  const taken = group.members.length + group.invites.length;
  const last = group.members.length <= 1;

  const move = () => {
    moveExpenses([...selected], group.id);
    toast(t('groups.moved', { count: selected.size }));
    setSelected(new Set());
    setPickOpen(false);
    void sync.syncNow();
  };

  const leave = async (takeExpenses: boolean) => {
    setLeaveOpen(false);
    setBusy(true);
    try {
      await sync.leaveGroup(group.id, takeExpenses);
      toast(t('groups.left'));
      navigate(routes.profile, { replace: true });
    } catch {
      toast(t('groups.errors.unknown'));
      setBusy(false);
    }
  };

  return (
    <Page>
      <PageHeader title={group.name} onBack={back} />

      <section className={styles.summary}>
        <span className={styles.summaryLabel}>
          {t('groups.total')} · {tp('plural.operations', groupExpenses.length)}
        </span>
        <span className={styles.summaryValue}>{fmt.money(sumIn(groupExpenses, baseCurrency), baseCurrency)}</span>
      </section>

      <section>
        <SectionLabel>
          {t('groups.members')} · {group.members.length} / {MAX_GROUP_MEMBERS}
        </SectionLabel>
        <div className={styles.members}>
          {group.members.map((m) => (
            <MemberPill key={m.id} id={m.id} name={m.name} you={m.id === session?.user.id ? t('groups.you') : undefined} />
          ))}
          {group.invites.map((i) => (
            <span key={i.id} className={styles.pending}>
              {i.email} · {t('groups.pending')}
            </span>
          ))}
        </div>
      </section>

      {taken < MAX_GROUP_MEMBERS && (
        <section>
          <SectionLabel>{t('groups.inviteTitle')}</SectionLabel>
          <InviteForm groupId={group.id} />
        </section>
      )}

      <ListGroup>
        <ListRow
          leading={<Icon name="users" />}
          title={t('groups.moveExpenses')}
          chevron
          onClick={() => setPickOpen(true)}
        />
        <ListRow
          leading={<Icon name="logout" />}
          title={t('groups.leave')}
          tone="danger"
          onClick={() => !busy && setLeaveOpen(true)}
        />
      </ListGroup>

      <Sheet
        open={pickOpen}
        onClose={() => setPickOpen(false)}
        title={t('groups.moveTitle')}
        subtitle={t('groups.moveLead')}
        closeLabel={t('common.close')}
        footer={
          <div className={styles.sheetFooter}>
            <Button icon="users" onClick={move} disabled={selected.size === 0}>
              {t('groups.moveCount', { count: selected.size })}
            </Button>
          </div>
        }
      >
        <ExpensePicker expenses={personal} selected={selected} onChange={setSelected} />
      </Sheet>

      <LeaveGroupDialog
        open={leaveOpen}
        groupName={group.name}
        last={last}
        onClose={() => setLeaveOpen(false)}
        onLeave={(take) => void leave(take)}
      />
    </Page>
  );
}
