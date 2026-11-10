import type { Currency, EurRate } from '@/shared/config/currency';
import type { ISODate } from '@/shared/lib/date';

export interface ExpenseItem {
  id: string;
  name: string;
  /** Цена за всю позицию, в валюте расхода. */
  price: number;
}

export type ExpenseSource = 'manual' | 'qr';

export interface Expense {
  id: string;
  /** Сумма в валюте покупки. */
  amount: number;
  currency: Currency;
  /** Курс на дату покупки: 1 EUR = eurRate единиц `currency`. Нужен для пересчёта. */
  eurRate: EurRate;
  categoryId: string;
  date: ISODate;
  /** HH:mm, если известно (у QR-чеков — всегда). */
  time?: string;
  merchant?: string;
  comment?: string;
  items: ExpenseItem[];
  /**
   * Сумма расхода = сумма позиций (пересчитывается автоматически).
   * Выключают редко — например, при скидке на весь чек. undefined у старых записей.
   */
  amountFromItems?: boolean;
  source: ExpenseSource;
  createdAt: string;
  updatedAt: string;
}

/** То, что вводит пользователь; служебные поля проставляет store. */
export type ExpenseInput = Omit<Expense, 'id' | 'eurRate' | 'createdAt' | 'updatedAt'>;
