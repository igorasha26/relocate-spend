import { useState, type FormEvent, type ReactNode } from 'react';
import { useCategoryName } from '@/entities/category';
import { ConversionHint, type ExpenseInput } from '@/entities/expense';
import { CategoryPickerSheet } from '@/features/category';
import { CurrencySheet } from '@/features/currency-picker';
import { useCategory } from '@/store';
import { useI18n } from '@/shared/i18n';
import { today } from '@/shared/lib/date';
import { parseAmount } from '@/shared/lib/money';
import { Button, InfoCard, PickerField, TextArea, TextInput } from '@/shared/ui';
import { itemsTotal } from '@/entities/expense';
import { draftAmount, draftToInput, isDraftValid, usesItemsTotal } from '../model';
import { ItemsTotalSwitch } from './ItemsTotalSwitch';
import type { useExpenseDraft } from '../useExpenseDraft';
import { AmountCard } from './AmountCard';
import { DateSheet } from './DateSheet';
import styles from './ExpenseForm.module.css';
import { ItemsTable } from './ItemsTable';

type DraftApi = ReturnType<typeof useExpenseDraft>;

interface Props {
  form: DraftApi;
  submitLabel: string;
  onSubmit: (input: ExpenseInput) => void;
  /** Блок над формой (баннер «Отсканируйте чек»). */
  header?: ReactNode;
  autoFocusAmount?: boolean;
}

type SheetName = 'currency' | 'category' | 'date' | null;

/**
 * Форма расхода — общая для «Добавить» и «Изменить».
 * Набор полей зависит от категории (category.fields): у «Жилья» нет магазина и позиций.
 */
export function ExpenseForm({ form, submitLabel, onSubmit, header, autoFocusAmount }: Props) {
  const { t, fmt } = useI18n();
  const categoryName = useCategoryName();
  const { draft, set } = form;
  const category = useCategory(draft.categoryId ?? undefined);
  const [sheet, setSheet] = useState<SheetName>(null);
  const formatAmount = (value: number) => (value > 0 ? String(Math.round(value * 100) / 100).replace('.', ',') : '');

  const fields = category?.fields;
  const showMerchant = Boolean(fields?.merchant);
  const showItems = Boolean(fields?.items);
  const valid = isDraftValid(draft, category);

  // Если у траты есть позиции и включён тумблер — сумма всегда равна их сумме
  const synced = usesItemsTotal(draft, category);
  const amount = draftAmount(draft, category);

  const dateLabel =
    draft.date === today() ? t('common.todayDate', { date: fmt.dayMonthYear(draft.date) }) : fmt.dayMonthYear(draft.date);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onSubmit(draftToInput(draft, category));
  };

  return (
    <form className={styles.form} onSubmit={submit} noValidate>
      {header}

      <AmountCard
        label={t('form.amount')}
        value={synced ? formatAmount(amount) : draft.amount}
        readOnly={synced}
        badge={synced ? t('item.amountAuto') : undefined}
        currency={draft.currency}
        onChange={(v) => set('amount', v)}
        onCurrencyClick={() => setSheet('currency')}
        currencyLabel={t('form.purchaseCurrency')}
        hint={<ConversionHint amount={amount} currency={draft.currency} date={draft.date} />}
        autoFocus={autoFocusAmount}
      />

      <PickerField
        label={t('form.category')}
        value={category ? categoryName.full(category) : undefined}
        placeholder={t('form.categoryPlaceholder')}
        onClick={() => setSheet('category')}
      />

      <PickerField label={t('form.date')} value={dateLabel} icon="calendar" onClick={() => setSheet('date')} />

      {showMerchant && (
        <TextInput
          label={`${t('form.merchant')} · ${t('common.optional')}`}
          placeholder={t('form.merchantPlaceholder')}
          value={draft.merchant}
          maxLength={60}
          onChange={(e) => set('merchant', e.target.value)}
        />
      )}

      {showItems && (
        <section className={styles.items}>
          <h3 className={styles.itemsTitle}>{t('form.items')}</h3>
          <ItemsTable initialItems={draft.items} currency={draft.currency} onChange={(items) => set('items', items)} />
          {draft.items.length > 0 && (
            <ItemsTotalSwitch
              checked={draft.amountFromItems}
              itemsTotal={itemsTotal(draft.items)}
              amount={parseAmount(draft.amount)}
              currency={draft.currency}
              onChange={(on) => {
                set('amountFromItems', on);
                // При выключении сумма остаётся прежней — дальше её можно править вручную
                if (!on) set('amount', formatAmount(itemsTotal(draft.items)));
              }}
            />
          )}
        </section>
      )}

      <TextArea
        label={`${t('form.comment')} · ${t('common.optional')}`}
        placeholder={t('form.commentPlaceholder')}
        value={draft.comment}
        maxLength={200}
        onChange={(e) => set('comment', e.target.value)}
      />

      {category && !showMerchant && !showItems && (
        <InfoCard
          title={t('form.onlyNeededTitle')}
          text={t('form.onlyNeededText', { category: categoryName.full(category) })}
        />
      )}

      <div className={styles.footer}>
        <p className={styles.note}>{t('form.recalcNote')}</p>
        <Button type="submit" disabled={!valid}>
          {submitLabel}
        </Button>
      </div>

      <CurrencySheet
        open={sheet === 'currency'}
        value={draft.currency}
        title={t('form.purchaseCurrency')}
        subtitle={t('form.purchaseCurrencyHint')}
        note={t('home.recalcNote')}
        onClose={() => setSheet(null)}
        onSubmit={(currency) => {
          set('currency', currency);
          setSheet(null);
        }}
      />
      <CategoryPickerSheet
        open={sheet === 'category'}
        value={draft.categoryId}
        onClose={() => setSheet(null)}
        onSubmit={(id) => {
          set('categoryId', id);
          setSheet(null);
        }}
      />
      <DateSheet
        open={sheet === 'date'}
        value={draft.date}
        onClose={() => setSheet(null)}
        onSubmit={(date) => {
          set('date', date);
          // Время из чека относится к исходной дате — при смене даты сбрасываем.
          if (date !== draft.date) set('time', undefined);
          setSheet(null);
        }}
      />
    </form>
  );
}

