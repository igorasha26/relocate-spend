import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCategoryName } from '@/entities/category';
import { ConversionHint, isAmountFromItems, ItemsCard } from '@/entities/expense';
import { ratesService } from '@/shared/lib/money';
import { DeleteExpenseDialog } from '@/features/expense-delete';
import { ItemsEditSheet } from '@/features/expense-form';
import { useActions, useAppState, useCategory, useExpense } from '@/store';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import { Button, Icon, KeyValueRow, Page, PageHeader } from '@/shared/ui';
import styles from './ExpenseDetailsPage.module.css';
import { ExpenseNotFound } from './ExpenseNotFound';

/** 05 · Детали расхода — полный чек: сумма, данные, позиции, редактирование и удаление (UI 17). */
export function ExpenseDetailsPage() {
  const { id } = useParams();
  const { t, fmt } = useI18n();
  const navigate = useNavigate();
  const { status } = useAppState();
  const expense = useExpense(id);
  const category = useCategory(expense?.categoryId);
  const categoryName = useCategoryName();
  const { updateExpense } = useActions();
  const [editingItems, setEditingItems] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (status !== 'ready') return null;
  if (!expense) return <ExpenseNotFound />;

  const canHaveItems = category?.fields.items ?? true;

  return (
    <Page>
      <PageHeader title={t('details.title')} onBack={() => navigate(-1)} />

      <section className={styles.hero}>
        <span className={styles.source}>
          <Icon name={expense.source === 'qr' ? 'scan' : 'pencil'} size={16} />
          {expense.source === 'qr' ? t('details.fromQr') : t('details.manual')}
        </span>
        <p className={styles.amount}>{fmt.money(expense.amount, expense.currency)}</p>
        <div className={styles.approx}>
          <ConversionHint
            amount={expense.amount}
            currency={expense.currency}
            date={expense.date}
            rates={expense.rates}
            eurRate={expense.rates ? undefined : expense.eurRate}
          />
        </div>
      </section>

      <section className={styles.card}>
        <KeyValueRow label={t('details.category')} value={categoryName.full(category)} />
        {expense.merchant && <KeyValueRow label={t('details.merchant')} value={expense.merchant} />}
        <KeyValueRow
          label={t('details.date')}
          value={`${fmt.numericDate(expense.date)}${expense.time ? `, ${expense.time}` : ''}`}
        />
        {expense.comment && <KeyValueRow label={t('details.comment')} value={expense.comment} />}
      </section>

      {expense.items.length > 0 && (
        <ItemsCard items={expense.items} currency={expense.currency} onItemClick={() => setEditingItems(true)} />
      )}

      {canHaveItems && (
        <Button
          variant="link"
          icon={expense.items.length ? 'pencil' : 'plus'}
          className={styles.addItem}
          onClick={() => setEditingItems(true)}
        >
          {expense.items.length ? t('details.editItems') : t('details.addItem')}
        </Button>
      )}

      {/* Курс, по которому трата пересчитывается во все валюты (зафиксирован при записи) */}
      <p className={styles.rate}>
        {t('details.purchaseRate', {
          rate: fmt.number(expense.currency === 'EUR' ? (expense.rates?.RSD ?? ratesService.getEurRate('RSD', expense.date)) : expense.eurRate, 2),
          currency: expense.currency === 'EUR' ? 'RSD' : expense.currency,
        })}
        {expense.ratesDate && ` · ${t('details.ratesOn', { date: fmt.dayMonthYear(expense.ratesDate) })}`}
      </p>

      <div className={styles.actions}>
        <Button onClick={() => navigate(routes.editExpense(expense.id))}>{t('details.edit')}</Button>
        <Button variant="danger-link" icon="trash" onClick={() => setDeleting(true)}>
          {t('details.delete')}
        </Button>
      </div>

      <ItemsEditSheet
        open={editingItems}
        items={expense.items}
        currency={expense.currency}
        subtitle={[expense.merchant, fmt.dayMonthYear(expense.date)].filter(Boolean).join(' · ')}
        onClose={() => setEditingItems(false)}
        amount={expense.amount}
        amountFromItems={isAmountFromItems(expense)}
        onSave={(result) => {
          updateExpense(expense.id, result);
          setEditingItems(false);
        }}
      />
      <DeleteExpenseDialog
        expense={deleting ? expense : null}
        onClose={() => setDeleting(false)}
        onDeleted={() => navigate(routes.home, { replace: true })}
      />
    </Page>
  );
}
