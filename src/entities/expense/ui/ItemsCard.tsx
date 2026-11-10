import type { ReactNode } from 'react';
import type { Currency } from '@/shared/config/currency';
import { useI18n } from '@/shared/i18n';
import type { ExpenseItem } from '../model';
import styles from './ItemsCard.module.css';

interface Props {
  items: ExpenseItem[];
  currency: Currency;
  onItemClick?: (item: ExpenseItem) => void;
  footer?: ReactNode;
}

/** «Позиции чека · 4 товара» — карточка на экранах деталей и проверки чека. */
export function ItemsCard({ items, currency, onItemClick, footer }: Props) {
  const { t, tp, fmt } = useI18n();
  return (
    <section className={styles.card}>
      <header className={styles.header}>
        <h3 className={styles.title}>{t('details.items')}</h3>
        <span className={styles.count}>{tp('plural.goods', items.length)}</span>
      </header>
      <ul className={styles.list}>
        {items.map((item) => {
          const content = (
            <>
              <span className={styles.name}>{item.name}</span>
              <span className={styles.price}>{fmt.money(item.price, currency)}</span>
            </>
          );
          return (
            <li key={item.id}>
              {onItemClick ? (
                <button type="button" className={styles.row} onClick={() => onItemClick(item)}>
                  {content}
                </button>
              ) : (
                <div className={styles.row}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
      {footer}
    </section>
  );
}
