/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Бэкенд-прокси для загрузки фискальных чеков (см. features/receipt-scan/receiptService.ts). */
  readonly VITE_RECEIPT_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
