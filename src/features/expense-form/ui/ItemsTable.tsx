import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import type { ExpenseItem } from '@/entities/expense';
import type { Currency } from '@/shared/config/currency';
import { useI18n } from '@/shared/i18n';
import { sanitizeAmountInput } from '@/shared/lib/money';
import { Icon } from '@/shared/ui';
import { emptyRow, isRowEmpty, itemsFromRows, parsePastedList, rowsFromItems, type ItemRow } from '../itemRows';
import styles from './ItemsTable.module.css';

interface Props {
  /** Начальные позиции. Компонент дальше управляет строками сам и сообщает наружу через onChange. */
  initialItems: ExpenseItem[];
  currency: Currency;
  onChange: (items: ExpenseItem[]) => void;
  autoFocus?: boolean;
}

/**
 * Быстрый ввод позиций таблицей:
 * — внизу всегда есть пустая строка, новая появляется сама;
 * — Enter: название → цена → следующая строка;
 * — можно вставить список «Молоко 590» построчно.
 * Связь суммы расхода с позициями — в ItemsTotalSwitch.
 */
export function ItemsTable({ initialItems, currency, onChange, autoFocus }: Props) {
  const { t } = useI18n();
  const [rows, setRows] = useState<ItemRow[]>(() => rowsFromItems(initialItems));
  const inputs = useRef(new Map<string, HTMLInputElement>());

  const commit = (next: ItemRow[]) => {
    // Всегда держим ровно одну пустую строку в конце.
    const filled = next.filter((r, i) => !isRowEmpty(r) || i === next.length - 1);
    const withTail = filled.length && isRowEmpty(filled[filled.length - 1]!) ? filled : [...filled, emptyRow()];
    setRows(withTail);
    onChange(itemsFromRows(withTail, (n) => t('item.fallbackName', { n })));
  };

  const update = (id: string, patch: Partial<ItemRow>) => commit(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const remove = (id: string) => commit(rows.filter((r) => r.id !== id));
  const focus = (id: string | undefined, field: 'name' | 'price') => {
    if (!id) return;
    const key = `${id}:${field}`;
    const el = inputs.current.get(key);
    // Синхронно, чтобы быстро набранные символы не ушли в предыдущее поле
    if (el) el.focus();
    else requestAnimationFrame(() => inputs.current.get(key)?.focus());
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>, index: number, field: 'name' | 'price') => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const row = rows[index]!;
    if (field === 'name') focus(row.id, 'price');
    else focus(rows[index + 1]?.id ?? rows[index]!.id, 'name');
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>, index: number) => {
    const text = e.clipboardData.getData('text');
    if (!text.includes('\n')) return; // одна строка — обычная вставка
    e.preventDefault();
    const pasted = parsePastedList(text);
    const before = rows.slice(0, index).filter((r) => !isRowEmpty(r));
    const after = rows.slice(index + 1).filter((r) => !isRowEmpty(r));
    const current = isRowEmpty(rows[index]!) ? [] : [rows[index]!];
    commit([...before, ...current, ...pasted, ...after]);
  };

  const filledCount = rows.filter((r) => !isRowEmpty(r)).length;

  return (
    <div className={styles.root}>
      <div className={styles.head} aria-hidden>
        <span>{t('item.name')}</span>
        <span className={styles.headPrice}>{t('item.rowPrice', { currency })}</span>
      </div>

      <ul className={styles.rows}>
        {rows.map((row, index) => {
          const last = index === rows.length - 1;
          return (
            <li key={row.id} className={styles.row}>
              <input
                ref={(el) => {
                  if (el) inputs.current.set(`${row.id}:name`, el);
                  else inputs.current.delete(`${row.id}:name`);
                }}
                className={styles.name}
                value={row.name}
                maxLength={80}
                placeholder={last ? t('item.namePlaceholder') : ''}
                aria-label={`${t('item.name')} ${index + 1}`}
                autoFocus={autoFocus && last && index === 0}
                enterKeyHint="next"
                onChange={(e) => update(row.id, { name: e.target.value })}
                onKeyDown={(e) => onKey(e, index, 'name')}
                onPaste={(e) => onPaste(e, index)}
              />
              <input
                ref={(el) => {
                  if (el) inputs.current.set(`${row.id}:price`, el);
                  else inputs.current.delete(`${row.id}:price`);
                }}
                className={styles.price}
                value={row.price}
                inputMode="decimal"
                placeholder="0"
                aria-label={`${t('item.price')} ${index + 1}`}
                enterKeyHint="next"
                onChange={(e) => update(row.id, { price: sanitizeAmountInput(e.target.value) })}
                onKeyDown={(e) => onKey(e, index, 'price')}
              />
              <button
                type="button"
                className={styles.remove}
                aria-label={t('item.delete')}
                disabled={isRowEmpty(row)}
                onClick={() => remove(row.id)}
              >
                <Icon name="close" size={16} strokeWidth={2.2} />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Пока позиций нет — подсказка по быстрому вводу; итог показывает переключатель суммы */}
      {filledCount === 0 && <p className={styles.footer}>{t('form.itemsHint')}</p>}
    </div>
  );
}
