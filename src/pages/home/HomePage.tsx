import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCategoryName } from '@/entities/category';
import { ENV } from '@/shared/config/env';
import {
  applyFilters,
  EMPTY_FILTERS,
  hasActiveFilters,
  inRange,
  searchExpenses,
  sumIn,
} from '@/entities/expense';
import { FiltersSheet } from '@/features/expense-filters';
import { isFuture, PeriodNavigator, PeriodSheet, previousPeriod, shiftPeriod, usePeriodLabels } from '@/features/period';
import { filterBySpace, groupSpace, useActions, useAppState, useGroups, useSpace } from '@/store';
import { InviteCard, SpaceSwitcher } from '@/features/groups';
import { routes } from '@/shared/config/routes';
import { useOnlineStatus } from '@/shared/hooks/useOnlineStatus';
import { useI18n } from '@/shared/i18n';
import { Button, EmptyState, EnvBadge, HeaderTag, IconButton, InfoCard, Notice, Page, PageHeader, TextInput } from '@/shared/ui';
import { ExpenseList, SearchResults } from '@/widgets/expense-list';
import { SpendingOverview } from '@/widgets/spending-overview';
import { HomeSkeleton } from './HomeSkeleton';
import styles from './HomePage.module.css';
import { useHomeState } from './useHomeState';

export function HomePage() {
  const { t, tp, fmt } = useI18n();
  // В тестовой и локальной сборке рядом с «Сербия» — метка TEST / DEV
  const headerTrailing = (
    <span style={{ display: 'flex', alignItems: 'center' }}>
      {!ENV.isProduction && <EnvBadge label={ENV.appEnv === 'staging' ? 'TEST' : 'DEV'} />}
      <HeaderTag>{t('common.country')}</HeaderTag>
    </span>
  );
  const navigate = useNavigate();
  const { status, expenses: allExpenses, categories } = useAppState();
  // Выбранный раздел (все / личные / группа) меняет только набор трат — экран тот же
  const { space, setSpace } = useSpace();
  const { invites } = useGroups();
  const expenses = useMemo(() => filterBySpace(allExpenses, space), [allExpenses, space]);
  const { reload } = useActions();
  const online = useOnlineStatus();
  const labels = usePeriodLabels();
  const categoryName = useCategoryName();
  const { period, setPeriod, currency, setCurrency, filters, setFilters } = useHomeState();

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sheet, setSheet] = useState<'filters' | 'period' | null>(null);

  const previous = previousPeriod(period);
  const inPeriod = useMemo(() => inRange(expenses, period.start, period.end), [expenses, period]);
  const inPrevious = useMemo(() => inRange(expenses, previous.start, previous.end), [expenses, previous.start, previous.end]);
  const filtered = useMemo(() => applyFilters(inPeriod, filters, currency), [inPeriod, filters, currency]);
  const nameById = useMemo(() => {
    const map = new Map(categories.map((c) => [c.id, categoryName.full(c)]));
    return (id: string) => map.get(id) ?? '';
  }, [categories, categoryName]);
  const found = useMemo(() => searchExpenses(filtered, query, nameById), [filtered, query, nameById]);

  const header = (
    <PageHeader title={t('home.title')} brand trailing={headerTrailing} />
  );

  /* ---------- 13 · Загрузка ---------- */
  if (status === 'loading') {
    return (
      <Page>
        {header}
        <HomeSkeleton />
      </Page>
    );
  }

  /* ---------- 12 · Ошибка ---------- */
  if (status === 'error') {
    return (
      <Page>
        {header}
        {!online && <Notice tone="warning" title={t('home.offlineBanner')} />}
        <EmptyState
          icon="cloudOff"
          tone="warning"
          title={t('home.errorTitle')}
          text={t('home.errorText')}
          actions={
            <>
              <Button onClick={reload}>{t('home.retry')}</Button>
              <Button variant="secondary" onClick={() => navigate(routes.add)}>
                {t('home.addOffline')}
              </Button>
            </>
          }
        />
        <InfoCard title={t('home.offlineTitle')} text={t('home.offlineText')} />
      </Page>
    );
  }

  /* ---------- UI 07 · Поиск ---------- */
  if (searchOpen) {
    return (
      <Page gap="sm">
        <div className={styles.searchHeader}>
          <PageHeader title={t('home.title')} trailing={headerTrailing} />
          <TextInput
            autoFocus
            enterKeyHint="search"
            leadingIcon="search"
            value={query}
            placeholder={t('search.placeholder')}
            aria-label={t('home.search')}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && setSearchOpen(false)}
            trailing={<IconButton icon="close" variant="plain" size={18} label={t('search.close')} onClick={() => { setQuery(''); setSearchOpen(false); }} />}
            className={styles.searchField}
          />
        </div>
        <button type="button" className={styles.searchPeriod} onClick={() => setSheet('period')}>
          {labels.title(period)}
        </button>
        <p className={styles.searchSummary}>
          {tp('plural.operations', found.length)} · {fmt.money(sumIn(found, currency), currency)}
        </p>
        {found.length > 0 ? <SearchResults expenses={found} /> : <p className={styles.muted}>{t('home.nothingFound')}</p>}
        <p className={styles.searchHint}>{t('search.hint')}</p>
        <PeriodSheet open={sheet === 'period'} period={period} onClose={() => setSheet(null)} onApply={(p) => { setPeriod(p); setSheet(null); }} />
      </Page>
    );
  }

  const filtersActive = hasActiveFilters(filters);

  return (
    <Page>
      {header}
      {!online && <Notice tone="warning" title={t('home.offlineBanner')} />}
      {invites.map((inv) => (
        <InviteCard key={inv.id} invite={inv} onAccepted={(id) => setSpace(groupSpace(id))} />
      ))}
      <SpaceSwitcher />

      <PeriodNavigator period={period} onChange={setPeriod} />

      {inPeriod.length === 0 ? (
        /* ---------- 11 · Нет расходов ---------- */
        <>
          <SpendingOverview
            period={period}
            previous={previous}
            allExpenses={expenses}
            expenses={inPeriod}
            previousExpenses={inPrevious}
            currency={currency}
            onCurrencyChange={setCurrency}
            onShowCategory={(id) => setFilters({ ...EMPTY_FILTERS, categoryIds: [id] })}
            onPeriodShift={(dir) => setPeriod(shiftPeriod(period, dir))}
            canGoNext={!isFuture(shiftPeriod(period, 1))}
          />
          <EmptyState
            icon="receipt"
            title={t('home.emptyTitle')}
            text={t('home.emptyText')}
            actions={
              <>
                <Button onClick={() => navigate(routes.add)}>{t('home.addFirst')}</Button>
                <Button variant="secondary" onClick={() => setSheet('period')}>
                  {t('home.pickOtherPeriod')}
                </Button>
              </>
            }
            footnote={t('home.emptyFootnote')}
          />
        </>
      ) : (
        <>
          <SpendingOverview
            period={period}
            previous={previous}
            allExpenses={expenses}
            expenses={inPeriod}
            previousExpenses={inPrevious}
            currency={currency}
            onCurrencyChange={setCurrency}
            onShowCategory={(id) => setFilters({ ...EMPTY_FILTERS, categoryIds: [id] })}
            onPeriodShift={(dir) => setPeriod(shiftPeriod(period, dir))}
            canGoNext={!isFuture(shiftPeriod(period, 1))}
          />

          <section className={styles.listSection}>
            <header className={styles.listHeader}>
              <h2 className={styles.listTitle}>{t('home.allExpenses')}</h2>
              <IconButton icon="search" label={t('home.search')} onClick={() => setSearchOpen(true)} />
              <span className={styles.filterButton}>
                <IconButton icon="sliders" label={t('home.filters')} onClick={() => setSheet('filters')} />
                {filtersActive && <span className={styles.filterDot} aria-hidden />}
              </span>
            </header>

            {filtersActive && (
              <button type="button" className={styles.activeFilters} onClick={() => setFilters(EMPTY_FILTERS)}>
                {tp('plural.operations', filtered.length)} · {t('common.reset')}
              </button>
            )}

            {filtered.length > 0 ? (
              <ExpenseList expenses={filtered} currency={currency} />
            ) : (
              <InfoCard title={t('home.nothingFound')} text={t('home.nothingFoundText')} />
            )}
          </section>
        </>
      )}

      <FiltersSheet
        open={sheet === 'filters'}
        value={filters}
        currency={currency}
        periodTitle={labels.title(period)}
        periodSubtitle={fmt.range(period.start, period.end)}
        onPeriodClick={() => setSheet('period')}
        onClose={() => setSheet(null)}
        onApply={(f) => {
          setFilters(f);
          setSheet(null);
        }}
      />
      <PeriodSheet
        open={sheet === 'period'}
        period={period}
        onClose={() => setSheet(null)}
        onApply={(p) => {
          setPeriod(p);
          setSheet(null);
        }}
      />
    </Page>
  );
}
