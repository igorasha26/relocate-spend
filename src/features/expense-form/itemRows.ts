import type { ExpenseItem } from '@/entities/expense';
import { createId } from '@/shared/lib/id';
import { parseAmount } from '@/shared/lib/money';

/** Строка таблицы позиций: цена хранится строкой, как её вводит пользователь. */
export interface ItemRow {
  id: string;
  name: string;
  price: string;
}

export const emptyRow = (): ItemRow => ({ id: createId(), name: '', price: '' });

export const isRowEmpty = (row: ItemRow) => row.name.trim() === '' && row.price.trim() === '';

export function rowsFromItems(items: ExpenseItem[]): ItemRow[] {
  return [...items.map((i) => ({ id: i.id, name: i.name, price: String(i.price).replace('.', ',') })), emptyRow()];
}

/** Заполненные строки → позиции. Строка без названия, но с ценой, получает имя «Позиция N». */
export function itemsFromRows(rows: ItemRow[], fallbackName: (n: number) => string): ExpenseItem[] {
  return rows
    .filter((r) => !isRowEmpty(r))
    .map((r, index) => ({ id: r.id, name: r.name.trim() || fallbackName(index + 1), price: parseAmount(r.price) }));
}

/** «1.200,00» → «1200,00», «12.5» → «12,5». Точка/запятая перед тремя цифрами — разделитель тысяч. */
function normalizePrice(raw: string): string {
  return raw.replace(/[.,](?=\d{3}(?:\D|$))/g, '').replace('.', ',');
}

const LINE = /^(.*\S)[\s\t;:–-]+(\d+(?:[.,]\d{3})*(?:[.,]\d{1,2})?)\s*(?:rsd|din|дин|€|eur|\$|usd|₽|rub|руб)?\.?$/i;

/**
 * Разбор вставленного списка: каждая строка — «название цена».
 * «Молоко 2 × 295 590» → { name: 'Молоко 2 × 295', price: '590' } (цена — последнее число).
 * Строка без числа в конце целиком становится названием.
 */
export function parsePastedList(text: string): ItemRow[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(LINE);
      if (!match) return { id: createId(), name: line, price: '' };
      let name = match[1]!.trim();
      let price = match[2]!;
      // «Овощи 1 090» — разряды через пробел: склеиваем, если перед группой слово, а не «2 × 295»
      const group = name.match(/^(.*\S)\s+(\d{1,3})$/);
      if (group && /^\d{3}$/.test(price) && !/[×x*]$/i.test(group[1]!) && !/\d$/.test(group[1]!)) {
        name = group[1]!;
        price = group[2]! + price;
      }
      return { id: createId(), name, price: normalizePrice(price) };
    });
}

