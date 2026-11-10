import { useEffect, useState } from 'react';
import { useCategoryName } from '@/entities/category';
import { EMPTY_FILTERS, hasActiveFilters, type ExpenseFilters } from '@/entities/expense';
import { CategoryPickerSheet } from '@/features/category';
import { useCategories } from '@/store';
import type { Currency } from '@/shared/config/currency';
import { useI18n } from '@/shared/i18n';
import { parseAmount, sanitizeAmountInput } from '@/shared/lib/money';
import { Button, OptionList, SectionLabel, Segmented, Sheet, TextInput } from '@/shared/ui';
import styles from './FiltersSheet.module.css';

interface Props {
  open: boolean;
  value: ExpenseFilters;
  currency: Currency;
  periodTitle: string;
  periodSubtitle: string;
  onPeriodClick: () => void;
  onClose: () => void;
  onApply: (filters: ExpenseFilters) => void;
}

const toInput = (n: number | null) => (n === null ? '' : String(n).replace('.', ','));
const fromInput = (s: string) => (s.trim() === '' ? null : parseAmount(s));

/** UI 08 · Фильтры расходов. */
export function FiltersSheet({ open, value, currency, periodTitle, periodSubtitle, onPeriodClick, onClose, onApply }: Props) {
  const { t } = useI18n();
  const categories = useCategories();
  const categoryName = useCategoryName();
  const [categoryIds, setCategoryIds] = useState<string[]>([]);
  const [merchant, setMerchant] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [source, setSource] = useState<ExpenseFilters['source']>('all');
  const [pickingCategory, setPickingCategory] = useState(false);

  const load = (f: ExpenseFilters) => {
    setCategoryIds(f.categoryIds);
    setMerchant(f.merchant);
    setMin(toInput(f.minAmount));
    setMax(toInput(f.maxAmount));
    setSource(f.source);
  };

  useEffect(() => {
    if (open) load(value);
  }, [open, value]);

  const current: ExpenseFilters = {
    categoryIds,
    merchant,
    minAmount: fromInput(min),
    maxAmount: fromInput(max),
    source,
  };

  const selectedNames = categoryIds
    .map((id) => categories.find((c) => c.id === id))
    .filter((c) => c !== undefined)
    .map((c) => categoryName.full(c));

  return (
    <>
      <Sheet
        open={open && !pickingCategory}
        onClose={onClose}
        title={t('filters.title')}
        closeLabel={t('common.close')}
        footer={<Button onClick={() => onApply(current)}>{t('filters.apply')}</Button>}
      >
        <SectionLabel
          action={
            hasActiveFilters(current) && (
              <button type="button" className={styles.reset} onClick={() => load(EMPTY_FILTERS)}>
                {t('common.reset')}
              </button>
            )
          }
        >
          {t('filters.period')}
        </SectionLabel>
        <OptionList<'period'>
          options={[{ value: 'period', title: periodTitle, subtitle: periodSubtitle }]}
          onSelect={onPeriodClick}
        />

        <div className={styles.section}>
          <SectionLabel>{t('filters.category')}</SectionLabel>
          <OptionList<'category'>
            selected={categoryIds.length ? 'category' : undefined}
            options={[
              {
                value: 'category',
                title: selectedNames.length ? selectedNames.join(', ') : t('filters.allCategories'),
                subtitle: t('filters.categoryHint'),
              },
            ]}
            onSelect={() => setPickingCategory(true)}
          />
        </div>

        <div className={styles.section}>
          <SectionLabel>{t('filters.merchant')}</SectionLabel>
          <TextInput
            aria-label={t('filters.merchant')}
            placeholder={t('filters.merchantPlaceholder')}
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            onClear={() => setMerchant('')}
            clearLabel={t('search.clear')}
            className={styles.input}
          />
        </div>

        <div className={styles.section}>
          <SectionLabel>{t('filters.amount', { currency })}</SectionLabel>
          <div className={styles.range}>
            <label className={styles.rangeBox}>
              <span className={styles.rangeLabel}>{t('filters.from')}</span>
              <input inputMode="decimal" placeholder="0" value={min} onChange={(e) => setMin(sanitizeAmountInput(e.target.value))} />
            </label>
            <label className={styles.rangeBox}>
              <span className={styles.rangeLabel}>{t('filters.to')}</span>
              <input inputMode="decimal" placeholder="∞" value={max} onChange={(e) => setMax(sanitizeAmountInput(e.target.value))} />
            </label>
          </div>
        </div>

        <div className={styles.section}>
          <SectionLabel>{t('filters.source')}</SectionLabel>
          <Segmented<ExpenseFilters['source']>
            value={source}
            onChange={setSource}
            className={styles.segmented}
            options={[
              { value: 'all', label: t('filters.sourceAll') },
              { value: 'manual', label: t('filters.sourceManual') },
              { value: 'qr', label: t('filters.sourceQr') },
            ]}
          />
        </div>

        <p className={styles.note}>{t('filters.note')}</p>
      </Sheet>

      <CategoryPickerSheet
        multiple
        allowCreate={false}
        open={open && pickingCategory}
        value={categoryIds}
        onClose={() => setPickingCategory(false)}
        onSubmit={(ids) => {
          setCategoryIds(ids);
          setPickingCategory(false);
        }}
      />
    </>
  );
}
