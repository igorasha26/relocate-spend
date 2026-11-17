import { useMemo, useState } from 'react';
import { groupByDay, sumIn, type Expense } from '@/entities/expense';
import { DeleteExpenseDialog } from '@/features/expense-delete';
import { MoveExpenseSheet } from '@/features/groups';
import { useCategories, useGroups } from '@/store';
import type { Currency } from '@/shared/config/currency';
import { useI18n } from '@/shared/i18n';
import { ExpenseRow } from './ExpenseRow';
import styles from './ExpenseList.module.css';
import { useDayLabel } from './useDayLabel';

interface Props {
  expenses: Expense[];
  /** Валюта для итогов дня. */
  currency: Currency;
}

/** Список расходов, сгруппированный по дням (макет 01). */
export function ExpenseList({ expenses, currency }: Props) {
  const { fmt } = useI18n();
  const categories = useCategories();
  const dayLabel = useDayLabel();
  // Открытой свайпом может быть только одна строка
  const [swipedId, setSwipedId] = useState<string | null>(null);
  // Действия из свайпа: один лист/диалог на весь список
  const [moving, setMoving] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState<Expense | null>(null);
  const canMove = useGroups().groups.length > 0;
  const groups = useMemo(() => groupByDay(expenses), [expenses]);
  const byId = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  return (
    <div className={styles.list}>
      {groups.map((group) => (
        <section key={group.date} className={styles.day}>
          <header className={styles.dayHeader}>
            <h3>{dayLabel(group.date)}</h3>
            <span>{fmt.money(sumIn(group.expenses, currency), currency)}</span>
          </header>
          <ul className={styles.items}>
            {group.expenses.map((e) => (
              <ExpenseRow
                key={e.id}
                expense={e}
                category={byId.get(e.categoryId)}
                swipeOpen={swipedId === e.id}
                onSwipeOpenChange={(open) => setSwipedId((cur) => (open ? e.id : cur === e.id ? null : cur))}
                onMove={canMove || e.groupId ? () => setMoving(e) : undefined}
                onDelete={() => setDeleting(e)}
              />
            ))}
          </ul>
        </section>
      ))}
      <MoveExpenseSheet expense={moving} onClose={() => setMoving(null)} />
      <DeleteExpenseDialog expense={deleting} onClose={() => setDeleting(null)} />
    </div>
  );
}
