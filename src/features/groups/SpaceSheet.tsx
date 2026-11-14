import { useNavigate } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import { Icon, OptionList, Sheet } from '@/shared/ui';
import { groupSpace, type Group, type SpaceId } from '@/store';
import styles from './groups.module.css';

interface Props {
  open: boolean;
  value: SpaceId;
  groups: Group[];
  /** Пункт «Все траты» — только на главной; в форме траты выбираем, куда записать. */
  withAll?: boolean;
  title: string;
  onClose: () => void;
  onSelect: (space: SpaceId) => void;
}

/** Выбор раздела: все траты, личные или группа. Применяется сразу по нажатию. */
export function SpaceSheet({ open, value, groups, withAll, title, onClose, onSelect }: Props) {
  const { t, tp } = useI18n();
  const navigate = useNavigate();
  const options = [
    ...(withAll ? [{ value: 'all' as SpaceId, title: t('space.all'), subtitle: t('space.allHint'), leading: <Icon name="layers" /> }] : []),
    { value: 'personal' as SpaceId, title: t('space.personal'), subtitle: t('space.personalHint'), leading: <Icon name="user" /> },
    ...groups.map((g) => ({
      value: groupSpace(g.id),
      title: g.name,
      subtitle: tp('plural.members', g.members.length),
      leading: <Icon name="users" />,
    })),
  ];
  return (
    <Sheet open={open} onClose={onClose} title={title} closeLabel={t('common.close')}>
      <OptionList<SpaceId> selected={value} onSelect={onSelect} options={options} />
      {withAll && (
        <button
          type="button"
          className={styles.spaceCreate}
          onClick={() => {
            onClose();
            navigate(routes.groupNew);
          }}
        >
          + {t('groups.create')}
        </button>
      )}
    </Sheet>
  );
}
