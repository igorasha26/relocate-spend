import { useId, type ReactNode } from 'react';
import styles from './Switch.module.css';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
}

/** Переключатель в стиле iOS со строкой-подписью. */
export function Switch({ checked, onChange, label, hint }: Props) {
  const id = useId();
  return (
    <label htmlFor={id} className={styles.row}>
      <span className={styles.text}>
        <span className={styles.label}>{label}</span>
        {hint && <span className={styles.hint}>{hint}</span>}
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        className={styles.input}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className={styles.track} aria-hidden>
        <span className={styles.thumb} />
      </span>
    </label>
  );
}
