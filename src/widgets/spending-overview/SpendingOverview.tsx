import { useCallback, useMemo, useState, type CSSProperties } from 'react';
import { useCategoryName } from '@/entities/category';
import { inRange, sumIn, totalsByCategory, type Expense } from '@/entities/expense';
import { CurrencySheet } from '@/features/currency-picker';
import { shiftPeriod, usePeriodLabels, type Period } from '@/features/period';
import { useCategories } from '@/store';
import type { Currency } from '@/shared/config/currency';
import { useAnimatedNumber } from '@/shared/hooks/useAnimatedNumber';
import { useHorizontalSwipe } from '@/shared/hooks/useHorizontalSwipe';
import { useSessionState } from '@/shared/hooks/useSessionState';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { minDate, parseISODate, today } from '@/shared/lib/date';
import { Icon, Segmented } from '@/shared/ui';
import { BarChart } from './BarChart';
import { buildBuckets, currentBucketIndex } from './buckets';
import { CategoryBreakdownSheet } from './CategoryBreakdownSheet';
import { DONUT_SIZE, DonutChart, type DonutSlice } from './DonutChart';
import { PeriodCarousel } from './PeriodCarousel';
import styles from './SpendingOverview.module.css';

interface Props {
  period: Period;
  previous: Period;
  /** Все расходы — для колец соседних периодов в карусели. */
  allExpenses: Expense[];
  expenses: Expense[];
  previousExpenses: Expense[];
  currency: Currency;
  onCurrencyChange: (currency: Currency) => void;
  onShowCategory: (categoryId: string) => void;
  /** Листание периодов свайпом: -1 — назад, 1 — вперёд. */
  onPeriodShift: (dir: 1 | -1) => void;
  canGoNext: boolean;
}

/** Плавно меняющееся число. Отдельный компонент — анимация не перерисовывает весь виджет. */
function AnimatedNumber({ value }: { value: number }) {
  const { fmt } = useI18n();
  return <>{fmt.number(useAnimatedNumber(value), 0)}</>;
}

/** Сколько категорий показывать отдельными сегментами; остальные — «Остальные». */
const MAX_SLICES = 6;

/** Итог за период + сравнение + карточка с кольцом/столбцами (макеты 01, 09). */
export function SpendingOverview({
  period,
  previous,
  allExpenses,
  expenses,
  previousExpenses,
  currency,
  onCurrencyChange,
  onShowCategory,
  onPeriodShift,
  canGoNext,
}: Props) {
  const { t, fmt } = useI18n();
  const labels = usePeriodLabels();
  const categories = useCategories();
  const categoryName = useCategoryName();
  const [mode, setMode] = useSessionState<'pie' | 'bars'>('home.chart', 'pie');
  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const periodKey = `${period.start}_${period.end}`;
  // Выбранный столбец привязан к периоду: при смене периода выбор сбрасывается сам.
  const [bucketChoice, setBucketChoice] = useState<{ key: string; index: number } | null>(null);
  const selectedBucket = bucketChoice?.key === periodKey ? bucketChoice.index : null;

  const total = sumIn(expenses, currency);
  const prevTotal = sumIn(previousExpenses, currency);
  const delta = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : null;

  /* ---- Сегменты кольца для любого периода ---- */
  const buildSlices = useCallback(
    (list: Expense[]): DonutSlice[] => {
      const totals = totalsByCategory(list, currency);
      const byId = new Map(categories.map((c) => [c.id, c]));
      const head = totals.length > MAX_SLICES ? totals.slice(0, MAX_SLICES - 1) : totals;
      const result: DonutSlice[] = head.map((x) => {
        const c = byId.get(x.categoryId);
        return { id: x.categoryId, value: x.total, color: c?.color ?? 'c7', label: categoryName.short(c) };
      });
      if (totals.length > MAX_SLICES) {
        const rest = totals.slice(MAX_SLICES - 1).reduce((s, x) => s + x.total, 0);
        result.push({ id: '__others', value: rest, color: 'muted', label: t('home.othersSlice') });
      }
      return result;
    },
    [currency, categories, categoryName, t],
  );

  const ringTitle = useCallback(
    (p: Period) => (p.kind === 'month' ? fmt.monthName(parseISODate(p.start).getMonth()) : labels.title(p)),
    [fmt, labels],
  );

  const ring = (p: Period, list: Expense[], neighbour: boolean) => (
    <DonutChart
      slices={buildSlices(list)}
      title={ringTitle(p)}
      caption={fmt.money(sumIn(list, currency), currency)}
      passive={neighbour}
      animate={!neighbour}
      onSliceClick={neighbour ? undefined : (id) => id !== '__others' && setCategoryId(id)}
    />
  );

  const slices = useMemo(() => buildSlices(expenses), [buildSlices, expenses]);
  const prevPeriod = shiftPeriod(period, -1);
  const nextPeriod = shiftPeriod(period, 1);
  // Кольца мемоизированы: перерисовываются только при смене данных, а не на каждый рендер
  const rings = useMemo(
    () => ({
      prev: ring(prevPeriod, inRange(allExpenses, prevPeriod.start, prevPeriod.end), true),
      current: ring(period, expenses, false),
      next: canGoNext ? ring(nextPeriod, inRange(allExpenses, nextPeriod.start, nextPeriod.end), true) : null,
    }),
    // ring и периоды выводятся из перечисленных значений
    [periodKey, allExpenses, expenses, canGoNext, buildSlices, ringTitle, currency],
  );
  const top = slices[0];
  const topShare = top && total > 0 ? Math.round((top.value / total) * 100) : 0;

  /* ---- Столбцы ---- */
  const buckets = useMemo(() => buildBuckets(period, expenses, currency, fmt), [period, expenses, currency, fmt]);
  const highlight = currentBucketIndex(buckets);
  const lastNonEmpty = buckets.reduce((acc, b, i) => (b.total > 0 ? i : acc), -1);
  const activeBucket = selectedBucket ?? (highlight >= 0 ? highlight : lastNonEmpty);
  const bucket = buckets[activeBucket];
  const bucketEnd = bucket && highlight === activeBucket ? minDate(bucket.end, today()) : bucket?.end;
  // Столбцы листаются свайпом без «подглядывания» соседей (они во всю ширину)
  const barsSwipe = useHorizontalSwipe({
    onSwipeRight: () => onPeriodShift(-1),
    onSwipeLeft: () => onPeriodShift(1),
    canSwipeLeft: canGoNext,
  });

  return (
    <>
      <section className={styles.summary}>
        <p className={styles.totalLabel}>{labels.totalLabel(period)}</p>
        <div className={styles.totalRow}>
          <span className={styles.total}>
            <AnimatedNumber value={total} />
            <span className={styles.totalSign}>{fmt.currencySign(currency)}</span>
          </span>
          <button type="button" className={styles.currencyButton} onClick={() => setCurrencyOpen(true)} aria-label={t('home.reportCurrency')}>
            {currency}
            <Icon name="chevronDown" size={16} strokeWidth={2.2} />
          </button>
        </div>
        {delta !== null && (
          <p className={cn(styles.delta, delta > 0 && styles.deltaUp)}>
            <Icon name={delta > 0 ? 'trendUp' : 'trendDown'} size={13} strokeWidth={2.4} />
            {delta === 0
              ? t('home.deltaSame', { prev: labels.previousLabel(previous) })
              : t(delta < 0 ? 'home.deltaLess' : 'home.deltaMore', {
                  percent: Math.abs(delta),
                  prev: labels.previousLabel(previous),
                })}
          </p>
        )}
      </section>

      <section className={styles.chartCard}>
        <header className={styles.chartHeader}>
          <h2 className={styles.chartTitle}>{mode === 'pie' ? t('home.byCategory') : t('home.dynamics')}</h2>
          <Segmented<'pie' | 'bars'>
            size="compact"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'pie', label: <Icon name="pie" size={18} />, ariaLabel: t('home.showPie') },
              { value: 'bars', label: <Icon name="bars" size={18} />, ariaLabel: t('home.showBars') },
            ]}
          />
        </header>

        {mode === 'pie' ? (
          <>
            {/* Слева и справа выглядывают кольца соседних периодов — их можно перелистнуть */}
            <PeriodCarousel
              periodKey={periodKey}
              height={DONUT_SIZE}
              onShift={onPeriodShift}
              prev={rings.prev}
              current={rings.current}
              next={rings.next}
            />

            {/* Категории и суммы плашками под кольцом */}
            {slices.length > 0 && (
              <ul className={styles.chips}>
                {slices.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      className={styles.chip}
                      disabled={s.id === '__others'}
                      onClick={() => setCategoryId(s.id)}
                    >
                      <span className={styles.legendDot} style={{ background: s.color === 'muted' ? 'var(--text-3)' : `var(--cat-${s.color})` }} />
                      <span className={styles.chipName}>{s.label}</span>
                      <span className={styles.chipValue}>{fmt.number(s.value, 0)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {top && (
              <p className={styles.chartFooter}>{t('home.topShare', { category: top.label, percent: topShare })}</p>
            )}
          </>
        ) : (
          <div
            className={styles.barsSwipe}
            {...barsSwipe.handlers}
            style={{ '--swipe': `${barsSwipe.offset}px` } as CSSProperties}
            data-dragging={barsSwipe.dragging || undefined}
          >
            <div>
              <BarChart
                buckets={buckets}
                highlight={highlight}
                selected={activeBucket}
                onSelect={(index) => setBucketChoice({ key: periodKey, index })}
              />
              {bucket && bucketEnd && (
                <p className={styles.bucketCaption}>
                  {t('home.bucketTotal', { range: fmt.range(bucket.start, bucketEnd), amount: fmt.money(bucket.total, currency) })}
                </p>
              )}
            </div>
          </div>
        )}
      </section>

      <CurrencySheet
        open={currencyOpen}
        value={currency}
        title={t('home.reportCurrency')}
        subtitle={t('home.reportCurrencyHint')}
        note={t('home.recalcNote')}
        onClose={() => setCurrencyOpen(false)}
        onSubmit={(c) => {
          onCurrencyChange(c);
          setCurrencyOpen(false);
        }}
      />
      <CategoryBreakdownSheet
        categoryId={categoryId}
        expenses={expenses}
        total={total}
        currency={currency}
        periodTitle={labels.title(period)}
        onClose={() => setCategoryId(null)}
        onShowAll={(id) => {
          setCategoryId(null);
          onShowCategory(id);
        }}
      />
    </>
  );
}
