import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MemberPill, NameSheet } from '@/features/groups';
import { analytics } from '@/shared/analytics';
import { useSession } from '@/shared/api';
import { HAS_BACKEND } from '@/shared/config/env';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import { Button, Icon, ListGroup, ListRow, SectionLabel, useToast } from '@/shared/ui';
import { groupErrorCode, groupsStore, useGroups, useSync } from '@/store';
import styles from './ProfilePage.module.css';

/** Профиль: приглашения в группы, мои группы, «Создать группу», моё имя. Только с аккаунтом. */
export function GroupsSection() {
  const { t, tp } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const session = useSession();
  const sync = useSync();
  const { groups, invites } = useGroups();
  const [nameOpen, setNameOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  if (!HAS_BACKEND || !session) return null;
  const me = groupsStore.me();

  const respond = async (inviteId: string, groupName: string, accept: boolean) => {
    setBusy(inviteId);
    try {
      if (accept) {
        const groupId = await groupsStore.acceptInvite(inviteId);
        analytics.track('group_invite_accepted');
        await sync.refreshGroups();
        toast(t('groups.joined', { group: groupName }));
        navigate(routes.group(groupId));
      } else {
        await groupsStore.declineInvite(inviteId);
      }
    } catch (err) {
      toast(t(`groups.errors.${groupErrorCode(err)}`));
    } finally {
      setBusy(null);
    }
  };

  return (
    <section>
      <SectionLabel>{t('groups.section')}</SectionLabel>

      {invites.map((inv) => (
        <div key={inv.id} className={styles.invite}>
          <p className={styles.inviteText}>
            <Icon name="users" size={18} />
            {t('groups.inviteFrom', { name: inv.invitedBy, group: inv.groupName })}
          </p>
          <div className={styles.inviteActions}>
            <Button variant="secondary" block={false} disabled={busy === inv.id} onClick={() => void respond(inv.id, inv.groupName, false)}>
              {t('groups.decline')}
            </Button>
            <Button block={false} disabled={busy === inv.id} onClick={() => void respond(inv.id, inv.groupName, true)}>
              {t('groups.accept')}
            </Button>
          </div>
        </div>
      ))}

      <ListGroup>
        {groups.map((g) => (
          <ListRow
            key={g.id}
            leading={<Icon name="users" />}
            title={g.name}
            subtitle={tp('plural.members', g.members.length)}
            chevron
            onClick={() => navigate(routes.group(g.id))}
          />
        ))}
        <ListRow leading={<Icon name="plus" />} title={t('groups.create')} tone="accent" onClick={() => navigate(routes.groupNew)} />
        <ListRow
          leading={<Icon name="user" />}
          title={t('groups.nameRow')}
          value={me ? <MemberPill id={me.id} name={me.name} small /> : undefined}
          chevron
          onClick={() => setNameOpen(true)}
        />
      </ListGroup>
      {groups.length === 0 && <p className={styles.groupsHint}>{t('groups.sectionHint')}</p>}

      <NameSheet open={nameOpen} onClose={() => setNameOpen(false)} current={me?.name ?? ''} />
    </section>
  );
}
