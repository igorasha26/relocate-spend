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
  /** Перенести в группу / в личные; нет — некуда переносить. */
  onMove?: () => void;
  onDelete: () => void;
}

/**
 * Строка расхода. Нажатие — страница чека (детали).
 * Свайп влево — «Изменить», «Перенести» (если есть группы) и «Удалить».
 */
export function ExpenseRow({ expense, category, swipeOpen, onSwipeOpenChange, onMove, onDelete }: Props) {
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
          ...(onMove ? [{ label: t('list.swipeMove'), icon: 'move' as const, tone: 'accent' as const, onClick: onMove }] : []),
          { label: t('list.delete'), icon: 'trash', tone: 'danger', onClick: onDelete },
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
