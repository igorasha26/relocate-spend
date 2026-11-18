import { nowTime, today } from '@/shared/lib/date';
import { isFiscalReceiptUrl, ReceiptError, type ParsedReceipt } from './model';
import { decodeFiscalQr } from './parseFiscal';

/**
 * Загрузка данных чека.
 *
 * Сайт suf.purs.gov.rs не отдаёт CORS-заголовки, поэтому браузер спрашивает наш сервер —
 * функцию Cloudflare `/api/receipt` (functions/api/receipt.ts), а она — налоговую.
 * Другой адрес можно задать переменной VITE_RECEIPT_API_URL.
 *
 * Если сервер или налоговая недоступны — сумма и время берутся прямо из QR (они в нём зашифрованы),
 * а магазин и категорию человек вводит сам.
 */
const API_URL = import.meta.env.VITE_RECEIPT_API_URL || '/api/receipt';

/** Каждый демо-чек уникален — иначе повторный скан не считался бы в лимит. */
export const demoReceiptUrl = () => `https://suf.purs.gov.rs/v/?vl=DEMO-${Date.now()}`;

function demoReceipt(): ParsedReceipt {
  return {
    merchant: 'Maxi',
    date: today(),
    time: nowTime(),
    amount: 2460,
    currency: 'RSD',
    categoryHint: 'food',
    items: [
      { name: 'Mleko, 2 × 295,00', price: 590 },
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

/** Ответ сервера: чек или код ошибки. null — сервер недоступен (сеть, 5xx, нет функции). */
async function fromServer(qrText: string): Promise<ParsedReceipt | 'notFiscal' | null> {
  try {
    const response = await fetch(`${API_URL}?url=${encodeURIComponent(qrText)}`, { signal: AbortSignal.timeout(15_000) });
    if (response.status === 422) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      return body.error === 'notFiscal' ? 'notFiscal' : null;
    }
    if (!response.ok || !response.headers.get('content-type')?.includes('json')) return null;
    const data: unknown = await response.json();
    return isParsedReceipt(data) ? data : null;
  } catch {
    return null;
  }
}

export async function fetchReceipt(qrText: string): Promise<ParsedReceipt> {
  if (!isFiscalReceiptUrl(qrText)) throw new ReceiptError('notFiscal');
  if (qrText.includes('vl=DEMO-')) {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return demoReceipt();
  }

  const offline = decodeFiscalQr(qrText);
  if (navigator.onLine) {
    const result = await fromServer(qrText);
    if (result === 'notFiscal' && !offline) throw new ReceiptError('notFiscal');
    if (result && result !== 'notFiscal') return result;
  }

  // Налоговая недоступна — хотя бы сумма и время из самого QR
  if (offline) {
    return { merchant: '', date: offline.date, time: offline.time, amount: offline.amount, currency: 'RSD', items: [], partial: true };
  }
  throw new ReceiptError(navigator.onLine ? 'unreadable' : 'offline');
}
