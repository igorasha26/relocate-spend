import { useNavigate } from 'react-router-dom';
import { CategoryIconTile, useCategoryName, type Category } from '@/entities/category';
import { expenseTitle, type Expense } from '@/entities/expense';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import { Icon, SwipeRow } from '@/shared/ui';
import styles from './ExpenseList.module.css';

interface Props {
  expense: Expense;
  category: Category | undefined;
  swipeOpen: boolean;
  onSwipeOpenChange: (open: boolean) => void;
}

/**
 * Строка расхода. Нажатие — страница чека (детали).
 * Свайп влево — «Изменить» и «Открыть»; удаление — внутри чека.
 */
export function ExpenseRow({ expense, category, swipeOpen, onSwipeOpenChange }: Props) {
  const { t, fmt } = useI18n();
  const navigate = useNavigate();
  const name = useCategoryName();
  const title = expenseTitle(expense, name.full(category));

  return (
    <li>
      <SwipeRow
        open={swipeOpen}
        onOpenChange={onSwipeOpenChange}
        onPress={() => navigate(routes.expense(expense.id))}
        actions={[
          { label: t('list.swipeEdit'), icon: 'pencil', tone: 'neutral', onClick: () => navigate(routes.editExpense(expense.id)) },
          { label: t('list.open'), icon: 'receipt', tone: 'accent', onClick: () => navigate(routes.expense(expense.id)) },
        ]}
      >
        <span className={styles.row}>
          {category && <CategoryIconTile icon={category.icon} color={category.color} className={styles.tile} />}
          <span className={styles.main}>
            <span className={styles.title}>{title}</span>
            <span className={styles.subtitle}>{name.full(category)}</span>
          </span>
          <span className={styles.side}>
            <span className={styles.amount}>{fmt.money(expense.amount, expense.currency)}</span>
            <Icon name="chevronRight" size={14} strokeWidth={2} className={styles.chevron} />
          </span>
        </span>
      </SwipeRow>
    </li>
  );
}
