import { useI18n } from '@/shared/i18n';
import { AlertDialog } from '@/shared/ui';

interface Props {
  open: boolean;
  groupName: string;
  /** Последний участник: после выхода группа удалится. */
  last: boolean;
  onClose: () => void;
  onLeave: (takeExpenses: boolean) => void;
}

/** Выход из группы. Последнему — предупреждение и выбор: забрать траты или удалить вместе с группой. */
export function LeaveGroupDialog({ open, groupName, last, onClose, onLeave }: Props) {
  const { t } = useI18n();
  return last ? (
    <AlertDialog
      open={open}
      onClose={onClose}
      title={t('groups.leaveLastTitle', { group: groupName })}
      message={t('groups.leaveLastText')}
      actions={[
        { label: t('groups.takeAndLeave'), onClick: () => onLeave(true) },
        { label: t('groups.deleteAndLeave'), onClick: () => onLeave(false), tone: 'danger' },
        { label: t('common.cancel'), onClick: onClose },
      ]}
    />
  ) : (
    <AlertDialog
      open={open}
      onClose={onClose}
      title={t('groups.leaveTitle', { group: groupName })}
      message={t('groups.leaveText')}
      actions={[
        { label: t('groups.leaveConfirm'), onClick: () => onLeave(false), tone: 'danger' },
        { label: t('common.cancel'), onClick: onClose },
      ]}
    />
  );
}
