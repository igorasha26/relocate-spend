import type { ReceiptErrorCode } from '@/features/receipt-scan';
import { useI18n, type TranslationKey } from '@/shared/i18n';
import { Button, Icon, Sheet } from '@/shared/ui';
import styles from './ScanPage.module.css';

const CONTENT: Record<Exclude<ReceiptErrorCode, 'limit'>, { title: TranslationKey; text: TranslationKey; retry: TranslationKey; manual: TranslationKey }> = {
  unreadable: { title: 'scan.unreadableTitle', text: 'scan.unreadableText', retry: 'scan.unreadableRetry', manual: 'scan.manual' },
  notFiscal: { title: 'scan.notFiscalTitle', text: 'scan.notFiscalText', retry: 'scan.notFiscalRetry', manual: 'scan.addManual' },
  offline: { title: 'scan.offlineTitle', text: 'scan.offlineText', retry: 'scan.offlineRetry', manual: 'scan.addOffline' },
  unavailable: { title: 'scan.unavailableTitle', text: 'scan.unavailableText', retry: 'scan.tryAgain', manual: 'scan.manual' },
  camera: { title: 'scan.cameraTitle', text: 'scan.cameraText', retry: 'scan.tryAgain', manual: 'scan.manual' },
};

interface Props {
  error: ReceiptErrorCode | null;
  /** Текст для ошибки лимита (зависит от даты и тарифа). */
  limitText: string;
  onRetry: () => void;
  onManual: () => void;
  onPro: () => void;
}

/** UI 27–29 · Ошибки сканирования. */
export function ScanErrorSheet({ error, limitText, onRetry, onManual, onPro }: Props) {
  const { t } = useI18n();
  const content =
    error === 'limit'
      ? { title: t('scan.limitTitle'), text: limitText, retry: t('scan.limitPro'), manual: t('scan.manual'), onPrimary: onPro }
      : error
        ? {
            title: t(CONTENT[error].title),
            text: t(CONTENT[error].text),
            retry: t(CONTENT[error].retry),
            manual: t(CONTENT[error].manual),
            onPrimary: onRetry,
          }
        : null;
  return (
    <Sheet
      open={error !== null}
      onClose={onRetry}
      title={content?.title ?? ''}
      closeLabel={t('common.close')}
      footer={
        content && (
          <div className={styles.sheetActions}>
            <Button onClick={content.onPrimary}>{content.retry}</Button>
            <Button variant="secondary" onClick={onManual}>
              {content.manual}
            </Button>
          </div>
        )
      }
    >
      <Icon name="alert" size={30} strokeWidth={1.8} className={styles.sheetIcon} />
      {content && <p className={styles.sheetText}>{content.text}</p>}
    </Sheet>
  );
}
