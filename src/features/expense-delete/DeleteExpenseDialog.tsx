import { expenseTitle, type Expense } from '@/entities/expense';
import { useCategoryName } from '@/entities/category';
import { useActions, useCategory } from '@/store';
import { useI18n } from '@/shared/i18n';
import { AlertDialog, useToast } from '@/shared/ui';

interface Props {
  expense: Expense | null;
  onClose: () => void;
  onDeleted?: () => void;
}

/** UI 17 · Удалить расход? */
export function DeleteExpenseDialog({ expense, onClose, onDeleted }: Props) {
  const { t, fmt } = useI18n();
  const { removeExpense } = useActions();
  const toast = useToast();
  const category = useCategory(expense?.categoryId);
  const categoryName = useCategoryName();

  return (
    <AlertDialog
      open={expense !== null}
      onClose={onClose}
      title={t('details.deleteTitle')}
      message={
        expense
          ? t('details.deleteText', {
              title: expenseTitle(expense, categoryName.full(category)),
              amount: fmt.money(expense.amount, expense.currency),
            })
          : undefined
      }
      actions={[
        {
          label: t('list.delete'),
          tone: 'danger',
          onClick: () => {
            if (!expense) return;
            removeExpense(expense.id);
            toast(t('details.deleted'));
            onClose();
            onDeleted?.();
          },
        },
        { label: t('common.cancel'), onClick: onClose },
      ]}
    />
  );
}
