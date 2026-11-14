import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useCategoryName } from '@/entities/category';
import { ConversionHint, ItemsCard, itemsTotal } from '@/entities/expense';
import { CategoryPickerSheet } from '@/features/category';
import { CurrencySheet } from '@/features/currency-picker';
import { AmountCard } from '@/features/expense-form';
import type { ParsedReceipt } from '@/features/receipt-scan';
import { useActions, useCategory, useSpace } from '@/store';
import { SpaceTarget } from '@/features/groups';
import { routes } from '@/shared/config/routes';
import type { Currency } from '@/shared/config/currency';
import { useI18n } from '@/shared/i18n';
import { createId } from '@/shared/lib/id';
import { parseAmount, sanitizeAmountInput } from '@/shared/lib/money';
import { Button, Icon, IconButton, Notice, Page, PageHeader, PickerField, TextInput, useToast } from '@/shared/ui';
import styles from './ReceiptReviewPage.module.css';

const DEFAULT_RECEIPT_CATEGORY = 'food';

function isReceiptState(state: unknown): state is { receipt: ParsedReceipt } {
  return typeof state === 'object' && state !== null && 'receipt' in state;
}

function ReviewForm({ receipt }: { receipt: ParsedReceipt }) {
  const { t, fmt } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const { addExpense } = useActions();
  const categoryName = useCategoryName();

  const [amount, setAmount] = useState(String(receipt.amount).replace('.', ','));
  const [currency, setCurrency] = useState<Currency>(receipt.currency);
  const [categoryId, setCategoryId] = useState<string | null>(DEFAULT_RECEIPT_CATEGORY);
  const [merchant, setMerchant] = useState(receipt.merchant);
  const [editingMerchant, setEditingMerchant] = useState(false);
  const [comment, setComment] = useState('');
  const [sheet, setSheet] = useState<'category' | 'currency' | null>(null);
  const [itemsWithIds] = useState(() => receipt.items.map((item) => ({ ...item, id: createId() })));
  const category = useCategory(categoryId ?? undefined);
  const { targetGroupId, groups } = useSpace();
  const [target, setTarget] = useState<string | null>(targetGroupId);
  const targetName = groups.find((g) => g.id === target)?.name;

  const value = parseAmount(amount);
  const valid = value > 0 && categoryId !== null;

  const save = () => {
    if (!valid || !categoryId) return;
    const expense = addExpense({
      amount: value,
      currency,
      categoryId,
      date: receipt.date,
      time: receipt.time,
      merchant: merchant.trim() || undefined,
      comment: comment.trim() || undefined,
      items: itemsWithIds,
      // Сумма чека совпадает с позициями — дальше она будет пересчитываться по ним
      amountFromItems: Math.abs(value - itemsTotal(itemsWithIds)) < 0.01,
      source: 'qr',
      groupId: targetName ? target! : undefined,
    });
    toast(targetName ? t('space.savedTo', { group: targetName }) : t('form.saved'));
    navigate(routes.expense(expense.id), { replace: true });
  };

  return (
    <Page gap="md">
      <PageHeader title={t('review.title')} onBack={() => navigate(-1)} />

      <Notice tone="success" icon="check" title={t('review.successTitle')} text={t('review.successText')} />
      <SpaceTarget value={target} onChange={setTarget} />

      <AmountCard
        label={t('review.amount')}
        value={amount}
        currency={currency}
        onChange={(v) => setAmount(sanitizeAmountInput(v))}
        onCurrencyClick={() => setSheet('currency')}
        currencyLabel={t('form.purchaseCurrency')}
        hint={
          <ConversionHint
            amount={value}
            currency={currency}
            date={receipt.date}
            suffix={t('form.rateOn', { date: fmt.numericDate(receipt.date) })}
          />
        }
      />

      <PickerField
        label={`${t('review.category')} · ${t('common.required')}`}
        value={category ? categoryName.full(category) : undefined}
        placeholder={t('form.categoryPlaceholder')}
        onClick={() => setSheet('category')}
      />

      {editingMerchant ? (
        <TextInput
          autoFocus
          label={t('form.merchant')}
          value={merchant}
          onChange={(e) => setMerchant(e.target.value)}
          onBlur={() => setEditingMerchant(false)}
          onKeyDown={(e) => e.key === 'Enter' && setEditingMerchant(false)}
        />
      ) : (
        <div className={styles.merchant}>
          <Icon name="store" size={22} className={styles.merchantIcon} />
          <div className={styles.merchantText}>
            <p className={styles.merchantName}>{merchant || '—'}</p>
            <p className={styles.merchantDate}>
              {fmt.dayMonthYear(receipt.date)}, {receipt.time}
            </p>
          </div>
          <IconButton icon="pencil" label={t('list.edit')} size={20} onClick={() => setEditingMerchant(true)} />
        </div>
      )}

      {itemsWithIds.length > 0 && <ItemsCard items={itemsWithIds} currency={currency} />}

      <TextInput
        label={t('review.comment')}
        placeholder={t('review.commentPlaceholder')}
        value={comment}
        maxLength={200}
        onChange={(e) => setComment(e.target.value)}
      />

      <div className={styles.actions}>
        <Button variant="link" onClick={() => navigate(routes.add, { replace: true })}>
          {t('review.cancel')}
        </Button>
        <Button disabled={!valid} onClick={save}>
          {t('review.save')}
        </Button>
        {!categoryId && <p className={styles.error}>{t('review.categoryRequired')}</p>}
      </div>

      <CategoryPickerSheet
        open={sheet === 'category'}
        value={categoryId}
        onClose={() => setSheet(null)}
        onSubmit={(id) => {
          setCategoryId(id);
          setSheet(null);
        }}
      />
      <CurrencySheet
        open={sheet === 'currency'}
        value={currency}
        title={t('form.purchaseCurrency')}
        subtitle={t('form.purchaseCurrencyHint')}
        onClose={() => setSheet(null)}
        onSubmit={(c) => {
          setCurrency(c);
          setSheet(null);
        }}
      />
    </Page>
  );
}

/** 04 · Подтверждение чека. Данные приходят со сканера через state роутера. */
export function ReceiptReviewPage() {
  const { state } = useLocation();
  if (!isReceiptState(state)) return <Navigate to={routes.scan} replace />;
  return <ReviewForm receipt={state.receipt} />;
}
