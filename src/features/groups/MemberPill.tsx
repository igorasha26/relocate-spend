import { cn } from '@/shared/lib/cn';
import { memberColor } from '@/store';
import styles from './groups.module.css';

interface Props {
  id: string;
  name: string;
  /** Пометка «вы» рядом с именем. */
  you?: string;
  small?: boolean;
}

/** Цветной овал с именем участника. Цвет постоянный для одного человека. */
export function MemberPill({ id, name, you, small }: Props) {
  const color = memberColor(id);
  return (
    <span
      className={cn(styles.pill, small && styles.pillSmall)}
      style={{ background: `color-mix(in srgb, var(--cat-${color}) 18%, transparent)`, color: `var(--cat-${color})` }}
    >
      <span className={styles.pillDot} style={{ background: `var(--cat-${color})` }} aria-hidden />
      <span className={styles.pillName}>{name}</span>
      {you && <span className={styles.pillYou}>· {you}</span>}
    </span>
  );
}
