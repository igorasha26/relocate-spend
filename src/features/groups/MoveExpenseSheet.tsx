import type { Expense } from '@/entities/expense';
import { useI18n } from '@/shared/i18n';
import { Icon, OptionList, Sheet, useToast } from '@/shared/ui';
import { useActions, useGroups } from '@/store';
import styles from './groups.module.css';

interface Props {
  /** Трата, которую переносим; null — лист закрыт. */
  expense: Expense | null;
  onClose: () => void;
}

const PERSONAL = 'personal';

/**
 * «Перенести в…»: в личные или в одну из групп (кроме той, где трата уже лежит).
 * Перенос, а не копия: сумма, дата и курс не меняются.
 */
export function MoveExpenseSheet({ expense, onClose }: Props) {
  const { t, tp } = useI18n();
  const toast = useToast();
  const { moveExpenses } = useActions();
  const { groups } = useGroups();

  const options = [
    ...(expense?.groupId
      ? [{ value: PERSONAL, title: t('space.personal'), subtitle: t('move.personalHint'), leading: <Icon name="user" /> }]
      : []),
    ...groups
      .filter((g) => g.id !== expense?.groupId)
      .map((g) => ({
        value: g.id,
        title: g.name,
        subtitle: tp('plural.members', g.members.length),
        leading: <Icon name="users" />,
      })),
  ];

  return (
    <Sheet open={expense !== null} onClose={onClose} title={t('move.title')} closeLabel={t('common.close')}>
      <p className={styles.moveHint}>{t('move.hint')}</p>
      <OptionList<string>
        onSelect={(value) => {
          if (!expense) return;
          const groupId = value === PERSONAL ? null : value;
          moveExpenses([expense.id], groupId);
          const name = groups.find((g) => g.id === groupId)?.name;
          toast(name ? t('move.doneGroup', { group: name }) : t('move.donePersonal'));
          onClose();
        }}
        options={options}
      />
    </Sheet>
  );
}
