import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { groupSpace, useGroups, type SpaceId } from '@/store';
import { SpaceSheet } from './SpaceSheet';
import styles from './groups.module.css';

interface Props {
  /** id группы или null — личные. */
  value: string | null;
  onChange: (groupId: string | null) => void;
}

/** Форма траты: «Куда: Личные / Дом». Только если есть группы. */
export function SpaceTarget({ value, onChange }: Props) {
  const { t } = useI18n();
  const { groups } = useGroups();
  const [open, setOpen] = useState(false);
  if (groups.length === 0) return null;
  const group = value ? groups.find((g) => g.id === value) : undefined;
  const current: SpaceId = group ? groupSpace(group.id) : 'personal';

  return (
    <>
      <button type="button" className={styles.target} onClick={() => setOpen(true)}>
        <Icon name={group ? 'users' : 'user'} size={18} />
        <span className={styles.targetLabel}>{t('space.target')}</span>
        <span className={styles.targetValue}>{group ? group.name : t('space.personal')}</span>
        <Icon name="chevronRight" size={16} />
      </button>
      <SpaceSheet
        open={open}
        value={current}
        groups={groups}
        title={t('space.targetTitle')}
        onClose={() => setOpen(false)}
        onSelect={(next) => {
          onChange(next.startsWith('g:') ? next.slice(2) : null);
          setOpen(false);
        }}
      />
    </>
  );
}
