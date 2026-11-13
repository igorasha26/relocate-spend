import { useMemo } from 'react';
import { CategoryIconTile, useCategoryName } from '@/entities/category';
import { expenseTitle, type Expense } from '@/entities/expense';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Icon } from '@/shared/ui';
import { useCategories } from '@/store';
import styles from './groups.module.css';

interface Props {
  expenses: Expense[];
  selected: Set<string>;
  onChange: (next: Set<string>) => void;
}

/** Список трат с галочками и «Выбрать все» — для переноса в группу. */
export function ExpensePicker({ expenses, selected, onChange }: Props) {
  const { t, fmt } = useI18n();
  const categories = useCategories();
  const name = useCategoryName();
  const allSelected = expenses.length > 0 && expenses.every((e) => selected.has(e.id));

  const days = useMemo(() => {
    const sorted = [...expenses].sort((a, b) => (b.date + (b.time ?? '')).localeCompare(a.date + (a.time ?? '')));
    const map = new Map<string, Expense[]>();
    for (const e of sorted) map.set(e.date, [...(map.get(e.date) ?? []), e]);
    return [...map.entries()];
  }, [expenses]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChange(next);
  };

  if (expenses.length === 0) return <p className={styles.empty}>{t('groups.noPersonal')}</p>;

  return (
    <div className={styles.picker}>
      <button
        type="button"
        className={styles.selectAll}
        onClick={() => onChange(allSelected ? new Set() : new Set(expenses.map((e) => e.id)))}
      >
        <span className={cn(styles.check, allSelected && styles.checkOn)} aria-hidden>
          {allSelected && <Icon name="check" size={14} strokeWidth={3} />}
        </span>
        {allSelected ? t('groups.deselectAll') : t('groups.selectAll')}
        <span className={styles.selectCount}>
          {selected.size} / {expenses.length}
        </span>
      </button>
      {days.map(([date, list]) => (
        <section key={date}>
          <h3 className={styles.day}>{fmt.dayMonth(date as Expense['date'])}</h3>
          <ul className={styles.rows}>
            {list.map((e) => {
              const category = categories.find((c) => c.id === e.categoryId);
              const on = selected.has(e.id);
              return (
                <li key={e.id}>
                  <button type="button" className={styles.row} onClick={() => toggle(e.id)} aria-pressed={on}>
                    <span className={cn(styles.check, on && styles.checkOn)} aria-hidden>
                      {on && <Icon name="check" size={14} strokeWidth={3} />}
                    </span>
                    {category && <CategoryIconTile icon={category.icon} color={category.color} />}
                    <span className={styles.rowMain}>
                      <span className={styles.rowTitle}>{expenseTitle(e, name.full(category))}</span>
                      <span className={styles.rowSub}>{name.full(category)}</span>
                    </span>
                    <span className={styles.rowAmount}>{fmt.money(e.amount, e.currency)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
