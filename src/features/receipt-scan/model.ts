import type { ISODate } from '@/shared/lib/date';

/** Данные фискального чека в нормализованном виде. */
export interface ParsedReceipt {
  merchant: string;
  date: ISODate;
  time: string;
  amount: number;
  currency: 'RSD';
  items: { name: string; price: number }[];
}

/** Коды ошибок соответствуют шторкам из макета (UI 27–29) + служебные. */
export type ReceiptErrorCode = 'unreadable' | 'notFiscal' | 'offline' | 'unavailable' | 'camera' | 'limit';

export class ReceiptError extends Error {
  readonly code: ReceiptErrorCode;

  constructor(code: ReceiptErrorCode, message?: string) {
    super(message ?? code);
    this.name = 'ReceiptError';
    this.code = code;
  }
}

const FISCAL_HOST = 'suf.purs.gov.rs';

/** QR-код фискального чека Сербии — ссылка на suf.purs.gov.rs/v/?vl=… */
export function isFiscalReceiptUrl(text: string): boolean {
  try {
    const url = new URL(text.trim());
    return url.protocol === 'https:' && (url.hostname === FISCAL_HOST || url.hostname.endsWith(`.${FISCAL_HOST}`));
  } catch {
    return false;
  }
}
