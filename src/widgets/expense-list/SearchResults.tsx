import { useNavigate } from 'react-router-dom';
import { useCategoryName } from '@/entities/category';
import { expenseTitle, groupByDay, type Expense } from '@/entities/expense';
import { useCategories } from '@/store';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import styles from './ExpenseList.module.css';

/** Результаты поиска (UI 07): карточки по дням, тап — детали расхода. */
export function SearchResults({ expenses }: { expenses: Expense[] }) {
  const { fmt } = useI18n();
  const navigate = useNavigate();
  const categories = useCategories();
  const name = useCategoryName();

  return (
    <div className={styles.list}>
      {groupByDay(expenses).map((group) => (
        <section key={group.date} className={styles.day}>
          <header className={styles.dayHeader}>
            <h3>{fmt.dayMonth(group.date)}</h3>
          </header>
          <div className={styles.cards}>
            {group.expenses.map((e) => {
              const category = categories.find((c) => c.id === e.categoryId);
              const title = expenseTitle(e, name.full(category));
              const subtitle = e.comment && e.comment !== title ? e.comment : name.full(category);
              return (
                <button key={e.id} type="button" className={styles.card} onClick={() => navigate(routes.expense(e.id))}>
                  <span className={styles.cardMain}>
                    <span className={styles.cardTitle}>{title}</span>
                    <span className={styles.cardSubtitle}>{subtitle}</span>
                  </span>
                  <span className={styles.cardAmount}>{fmt.money(e.amount, e.currency)}</span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
