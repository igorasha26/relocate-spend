import { nowTime, today } from '@/shared/lib/date';
import { isFiscalReceiptUrl, ReceiptError, type ParsedReceipt } from './model';

/**
 * Загрузка данных чека.
 *
 * Страница suf.purs.gov.rs не отдаёт CORS-заголовки, поэтому из браузера её
 * напрямую не прочитать — нужен свой бэкенд-прокси, который вернёт ParsedReceipt.
 * Адрес задаётся переменной окружения VITE_RECEIPT_API_URL
 * (запрос: GET {VITE_RECEIPT_API_URL}?url=<ссылка из QR>).
 *
 * Без бэкенда:
 *  - в dev-режиме возвращается демо-чек (чтобы можно было пройти весь сценарий);
 *  - в production — ошибка 'unavailable' с честным сообщением пользователю.
 */
const API_URL = import.meta.env.VITE_RECEIPT_API_URL;

/** Каждый демо-чек уникален — иначе повторный скан не считался бы в лимит. */
export const demoReceiptUrl = () => `https://suf.purs.gov.rs/v/?vl=DEMO-${Date.now()}`;

function demoReceipt(): ParsedReceipt {
  return {
    merchant: 'Maxi · Beograd',
    date: today(),
    time: nowTime(),
    amount: 2460,
    currency: 'RSD',
    items: [
      { name: 'Mleko, 2 × 295', price: 590 },
      { name: 'Hleb i peciva', price: 420 },
      { name: 'Jogurt', price: 360 },
      { name: 'Voće i povrće', price: 1090 },
    ],
  };
}

function isParsedReceipt(value: unknown): value is ParsedReceipt {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return typeof r.merchant === 'string' && typeof r.date === 'string' && typeof r.amount === 'number' && Array.isArray(r.items);
}

export async function fetchReceipt(qrText: string): Promise<ParsedReceipt> {
  if (!isFiscalReceiptUrl(qrText)) throw new ReceiptError('notFiscal');
  if (!navigator.onLine) throw new ReceiptError('offline');

  if (!API_URL) {
    if (import.meta.env.DEV) {
      await new Promise((resolve) => setTimeout(resolve, 600));
      return demoReceipt();
    }
    throw new ReceiptError('unavailable');
  }

  let response: Response;
  try {
    response = await fetch(`${API_URL}?url=${encodeURIComponent(qrText)}`);
  } catch {
    throw new ReceiptError(navigator.onLine ? 'unavailable' : 'offline');
  }
  if (!response.ok) throw new ReceiptError(response.status === 422 ? 'notFiscal' : 'unreadable');
  const data: unknown = await response.json();
  if (!isParsedReceipt(data)) throw new ReceiptError('unreadable');
  return data;
}
