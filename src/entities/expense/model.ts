import type { Currency, EurRate } from '@/shared/config/currency';
import type { ISODate } from '@/shared/lib/date';
import type { RateTable } from '@/shared/lib/rates';

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
  /**
   * Курсы всех валют на дату покупки (1 EUR = N). Фиксируются при записи, поэтому пересчёт
   * в любую валюту не «плывёт» со временем. У трат, записанных до 13.11.2026, может отсутствовать.
   */
  rates?: RateTable;
  /** Дата, на которую взяты курсы (null/нет — встроенная таблица). */
  ratesDate?: ISODate;
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
export type ExpenseInput = Omit<Expense, 'id' | 'eurRate' | 'rates' | 'ratesDate' | 'createdAt' | 'updatedAt'>;
