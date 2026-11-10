import { useNavigate } from 'react-router-dom';
import { useCategoryName } from '@/entities/category';
import { amountIn, expenseTitle, sortByDateDesc, type Expense } from '@/entities/expense';
import { useCategory } from '@/store';
import type { Currency } from '@/shared/config/currency';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import { Button, Sheet } from '@/shared/ui';
import styles from './SpendingOverview.module.css';

interface Props {
  categoryId: string | null;
  expenses: Expense[];
  total: number;
  currency: Currency;
  periodTitle: string;
  onClose: () => void;
  onShowAll: (categoryId: string) => void;
}

/** UI 05 · Категория на диаграмме. */
export function CategoryBreakdownSheet({ categoryId, expenses, total, currency, periodTitle, onClose, onShowAll }: Props) {
  const { t, tp, fmt } = useI18n();
  const navigate = useNavigate();
  const category = useCategory(categoryId ?? undefined);
  const name = useCategoryName();

  const list = sortByDateDesc(expenses.filter((e) => e.categoryId === categoryId));
  const sum = list.reduce((s, e) => s + amountIn(e, currency), 0);
  const share = total > 0 ? Math.round((sum / total) * 100) : 0;

  return (
    <Sheet
      open={categoryId !== null}
      onClose={onClose}
      title={name.full(category)}
      closeLabel={t('common.close')}
      footer={<Button onClick={() => categoryId && onShowAll(categoryId)}>{t('home.showAll')}</Button>}
    >
      <p className={styles.sheetPeriod}>{periodTitle}</p>
      <p className={styles.sheetAmount}>{fmt.money(sum, currency)}</p>
      <span className={styles.shareBadge}>{t('home.categoryShare', { percent: share })}</span>
      <p className={styles.sheetCount}>{tp('plural.operations', list.length)}</p>
      <div className={styles.sheetList}>
        {list.map((e) => (
          <button key={e.id} type="button" className={styles.sheetItem} onClick={() => navigate(routes.expense(e.id))}>
            <span className={styles.sheetItemMain}>
              <span className={styles.sheetItemTitle}>{expenseTitle(e, name.full(category))}</span>
              <span className={styles.sheetItemMeta}>
                {fmt.dayMonth(e.date)} · {name.short(category)}
              </span>
            </span>
            <span className={styles.sheetItemAmount}>{fmt.money(amountIn(e, currency), currency)}</span>
          </button>
        ))}
      </div>
      <p className={styles.sheetNote}>{t('home.categorySumNote')}</p>
    </Sheet>
  );
}
