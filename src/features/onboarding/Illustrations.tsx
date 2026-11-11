import { useI18n } from '@/shared/i18n';
import { Icon } from '@/shared/ui';
import styles from './Onboarding.module.css';

/** Мини-иллюстрации к слайдам — из тех же элементов, что и интерфейс. */

export function WelcomeArt() {
  return (
    <div className={styles.art}>
      <img className={styles.logo} src={`${import.meta.env.BASE_URL}apple-touch-icon.png`} alt="" width={96} height={96} />
    </div>
  );
}

export function AddArt() {
  const { fmt } = useI18n();
  return (
    <div className={styles.art}>
      <div className={styles.mockCard}>
        <span className={styles.mockLabel} />
        <span className={styles.mockAmount}>
          {fmt.number(2460, 0)} <small>{fmt.currencySign('RSD')}</small>
        </span>
        <span className={styles.mockChips}>
          <i>≈ 21 €</i>
          <i>≈ 23 $</i>
          <i>≈ 1 960 ₽</i>
        </span>
      </div>
      <span className={styles.mockAdd}>
        <Icon name="plus" size={26} strokeWidth={2.2} />
      </span>
    </div>
  );
}

const RING = [
  { share: 0.55, color: 'var(--cat-c1)' },
  { share: 0.22, color: 'var(--cat-c2)' },
  { share: 0.12, color: 'var(--cat-c3)' },
  { share: 0.11, color: 'var(--cat-c4)' },
];

function Ring({ size, dim }: { size: number; dim?: boolean }) {
  const r = size / 2 - 12;
  const c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ opacity: dim ? 0.35 : 1 }} aria-hidden>
      {RING.map((seg) => {
        const len = seg.share * c - 5;
        const el = (
          <circle
            key={seg.color}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={16}
            strokeDasharray={`${len} ${c - len}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
        offset += seg.share * c;
        return el;
      })}
    </svg>
  );
}

export function OverviewArt() {
  return (
    <div className={styles.art}>
      <div className={styles.ringRow}>
        <span className={styles.ringSide}>
          <Ring size={110} dim />
        </span>
        <Ring size={150} />
        <span className={styles.swipeHint}>
          <Icon name="chevronRight" size={22} strokeWidth={2.4} />
        </span>
      </div>
    </div>
  );
}

export function GesturesArt() {
  const { fmt, tDynamic } = useI18n();
  return (
    <div className={styles.art}>
      <div className={styles.mockRowWrap}>
        <div className={styles.mockRow}>
          <span className={styles.mockTile}>
            <Icon name="cart" size={20} />
          </span>
          <span className={styles.mockLines}>
            <b>Maxi</b>
            <i>{tDynamic('categories.short.food', '')}</i>
          </span>
          <span className={styles.mockSum}>{fmt.number(2460, 0)}</span>
        </div>
        <span className={styles.mockAction} data-tone="neutral">
          <Icon name="pencil" size={18} />
        </span>
        <span className={styles.mockAction} data-tone="accent">
          <Icon name="receipt" size={18} />
        </span>
      </div>
      <span className={styles.finger} aria-hidden>
        <Icon name="chevronLeft" size={20} strokeWidth={2.4} />
        <Icon name="chevronLeft" size={20} strokeWidth={2.4} />
      </span>
    </div>
  );
}
