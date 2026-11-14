import { useState } from 'react';
import { analytics } from '@/shared/analytics';
import { useI18n } from '@/shared/i18n';
import { Button, Icon, useToast } from '@/shared/ui';
import { groupErrorCode, groupsStore, useSync, type GroupInviteIn } from '@/store';
import styles from './groups.module.css';

interface Props {
  invite: GroupInviteIn;
  onAccepted: (groupId: string) => void;
}

/** «Игорь приглашает вас в группу «Дом»» — Принять / Отклонить. В профиле и на главной. */
export function InviteCard({ invite, onAccepted }: Props) {
  const { t } = useI18n();
  const toast = useToast();
  const sync = useSync();
  const [busy, setBusy] = useState(false);

  const respond = async (accept: boolean) => {
    setBusy(true);
    try {
      if (accept) {
        const groupId = await groupsStore.acceptInvite(invite.id);
        analytics.track('group_invite_accepted');
        await sync.refreshGroups();
        toast(t('groups.joined', { group: invite.groupName }));
        onAccepted(groupId);
      } else {
        await groupsStore.declineInvite(invite.id);
      }
    } catch (err) {
      toast(t(`groups.errors.${groupErrorCode(err)}`));
      setBusy(false);
    }
  };

  return (
    <div className={styles.invite}>
      <p className={styles.inviteText}>
        <Icon name="users" size={18} />
        {t('groups.inviteFrom', { name: invite.invitedBy, group: invite.groupName })}
      </p>
      <div className={styles.inviteActions}>
        <Button variant="secondary" block={false} disabled={busy} onClick={() => void respond(false)}>
          {t('groups.decline')}
        </Button>
        <Button block={false} disabled={busy} onClick={() => void respond(true)}>
          {t('groups.accept')}
        </Button>
      </div>
    </div>
  );
}
