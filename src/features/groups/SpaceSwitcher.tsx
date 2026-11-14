import { useState } from 'react';
import { analytics } from '@/shared/analytics';
import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import { useSpace } from '@/store';
import { SpaceSheet } from './SpaceSheet';
import styles from './groups.module.css';

/**
 * Главная: какой раздел сейчас показан и куда попадут новые траты.
 * Виден только тем, у кого есть группы — у остальных главная не меняется.
 */
export function SpaceSwitcher() {
  const { t } = useI18n();
  const { space, setSpace, groups, group } = useSpace();
  const [open, setOpen] = useState(false);
  if (groups.length === 0) return null;

  const name = group ? group.name : space === 'personal' ? t('space.personal') : t('space.all');
  const hint = group ? t('space.addsHere') : t('space.addsPersonal');

  return (
    <div className={styles.spaceBar}>
      <button type="button" className={styles.spaceButton} aria-label={t('space.choose')} onClick={() => setOpen(true)}>
        <Icon name={group ? 'users' : space === 'personal' ? 'user' : 'layers'} size={17} />
        <span className={styles.spaceName}>{name}</span>
        <Icon name="chevronDown" size={16} />
      </button>
      <span className={styles.spaceHint}>{hint}</span>
      <SpaceSheet
        open={open}
        value={space}
        groups={groups}
        withAll
        title={t('space.choose')}
        onClose={() => setOpen(false)}
        onSelect={(next) => {
          setSpace(next);
          setOpen(false);
          analytics.track('space_switched', { to: next === 'all' || next === 'personal' ? next : 'group' });
        }}
      />
    </div>
  );
}
