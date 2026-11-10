import { useNavigate, useParams } from 'react-router-dom';
import type { Expense } from '@/entities/expense';
import { draftFromExpense, ExpenseForm, useExpenseDraft } from '@/features/expense-form';
import { useActions, useAppState, useExpense } from '@/store';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import { Page, PageHeader, useToast } from '@/shared/ui';
import { ExpenseNotFound } from '../expense-details/ExpenseNotFound';

function EditForm({ expense }: { expense: Expense }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const { updateExpense } = useActions();
  const form = useExpenseDraft(() => draftFromExpense(expense));

  return (
    <Page>
      <PageHeader title={t('form.editTitle')} onBack={() => navigate(-1)} />
      <ExpenseForm
        form={form}
        submitLabel={t('form.saveChanges')}
        onSubmit={(input) => {
          updateExpense(expense.id, input);
          toast(t('form.updated'));
          navigate(routes.expense(expense.id), { replace: true });
        }}
      />
    </Page>
  );
}

/** UI 26 · Изменить трату. */
export function EditExpensePage() {
  const { id } = useParams();
  const { status } = useAppState();
  const expense = useExpense(id);
  if (status !== 'ready') return null;
  if (!expense) return <ExpenseNotFound />;
  // key: при переходе на другой расход форма пересоздаётся с новыми данными
  return <EditForm key={expense.id} expense={expense} />;
}
