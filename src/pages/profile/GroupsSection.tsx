import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { InviteCard, MemberPill, NameSheet } from '@/features/groups';
import { useSession } from '@/shared/api';
import { HAS_BACKEND } from '@/shared/config/env';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import { Icon, ListGroup, ListRow, SectionLabel } from '@/shared/ui';
import { groupsStore, useGroups } from '@/store';
import styles from './ProfilePage.module.css';

/** Профиль: приглашения в группы, мои группы, «Создать группу», моё имя. Только с аккаунтом. */
export function GroupsSection() {
  const { t, tp } = useI18n();
  const navigate = useNavigate();
  const session = useSession();
  const { groups, invites } = useGroups();
  const [nameOpen, setNameOpen] = useState(false);

  if (!HAS_BACKEND || !session) return null;
  const me = groupsStore.me();

  return (
    <section>
      <SectionLabel>{t('groups.section')}</SectionLabel>

      <div className={styles.invites}>
        {invites.map((inv) => (
          <InviteCard key={inv.id} invite={inv} onAccepted={(id) => navigate(routes.group(id))} />
        ))}
      </div>

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
