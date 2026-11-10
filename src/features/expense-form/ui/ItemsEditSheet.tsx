import { useState } from 'react';
import type { ExpenseItem } from '@/entities/expense';
import type { Currency } from '@/shared/config/currency';
import { useI18n } from '@/shared/i18n';
import { itemsTotal } from '@/entities/expense';
import { Button, Sheet } from '@/shared/ui';
import { ItemsTotalSwitch } from './ItemsTotalSwitch';
import { ItemsTable } from './ItemsTable';
import styles from './ItemsEditSheet.module.css';

interface Props {
  open: boolean;
  items: ExpenseItem[];
  currency: Currency;
  subtitle?: string;
  /** Текущая сумма расхода. */
  amount: number;
  /** Считается ли сумма по позициям (флаг чека). */
  amountFromItems: boolean;
  onClose: () => void;
  onSave: (result: { items: ExpenseItem[]; amountFromItems: boolean; amount: number }) => void;
}

/** Редактирование всех позиций сохранённого расхода разом (экран деталей). */
export function ItemsEditSheet({ open, items, currency, subtitle, amount, amountFromItems, onClose, onSave }: Props) {
  const { t } = useI18n();
  const [sync, setSync] = useState(amountFromItems);
  const [draft, setDraft] = useState(items);
  // Новый ключ при каждом открытии — таблица начинает с актуальных позиций.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setDraft(items);
      setSession((s) => s + 1);
      setSync(amountFromItems);
    }
  }

  const newTotal = itemsTotal(draft);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('details.items')}
      subtitle={subtitle}
      closeLabel={t('common.close')}
      footer={
        <Button
          onClick={() =>
            onSave({ items: draft, amountFromItems: sync, amount: sync && draft.length > 0 ? newTotal : amount })
          }
        >
          {t('item.saveAll')}
        </Button>
      }
    >
      <ItemsTable key={session} initialItems={items} currency={currency} onChange={setDraft} autoFocus={items.length === 0} />
      {draft.length > 0 && (
        <div className={styles.recalc}>
          <ItemsTotalSwitch checked={sync} onChange={setSync} itemsTotal={newTotal} amount={amount} currency={currency} />
        </div>
      )}
    </Sheet>
  );
}
