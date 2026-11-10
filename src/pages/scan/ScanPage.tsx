import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { demoReceiptUrl, fetchReceipt, ReceiptError, useQrScanner, type ReceiptErrorCode } from '@/features/receipt-scan';
import { FREE_SCAN_LIMIT, routes } from '@/shared/config/routes';
import { useActions, useScanQuota } from '@/store';
import { addMonths, startOfMonth, today } from '@/shared/lib/date';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Button, Icon, Page, PageHeader } from '@/shared/ui';
import { ScanErrorSheet } from './ScanErrorSheet';
import styles from './ScanPage.module.css';

/** 03 · Сканирование QR. */
export function ScanPage() {
  const { t, fmt } = useI18n();
  const navigate = useNavigate();
  const { recordScan } = useActions();
  const quota = useScanQuota(FREE_SCAN_LIMIT);
  // Лимит исчерпан — сразу объясняем, камеру не включаем
  const [error, setError] = useState<ReceiptErrorCode | null>(() => (quota.remaining === 0 ? 'limit' : null));
  const [loading, setLoading] = useState(false);
  const { canScan } = quota;

  const handleCode = useCallback(
    async (text: string) => {
      if (!canScan(text)) {
        setError('limit');
        return;
      }
      setLoading(true);
      try {
        const receipt = await fetchReceipt(text);
        recordScan(text);
        navigate(routes.scanReview, { replace: true, state: { receipt } });
      } catch (e) {
        setError(e instanceof ReceiptError ? e.code : 'unreadable');
      } finally {
        setLoading(false);
      }
    },
    [navigate, canScan, recordScan],
  );

  const scanner = useQrScanner(handleCode, error === null && !loading);
  const cameraUnavailable = scanner.status === 'unsupported' || scanner.status === 'denied';
  const showVideo = scanner.status === 'scanning' || scanner.status === 'starting';

  return (
    <Page className={styles.page}>
      <PageHeader title={t('scan.title')} onBack={() => navigate(-1)} />

      <div>
        <h2 className={styles.heading}>{t('scan.heading')}</h2>
        <p className={styles.subtitle}>{t('scan.subtitle')}</p>
      </div>

      <section className={styles.camera} aria-label={t('scan.camera')}>
        <span className={styles.cameraLabel}>{t('scan.camera')}</span>
        <div className={styles.frame}>
          <video ref={scanner.videoRef} className={cn(styles.video, !showVideo && styles.hidden)} playsInline muted />
          {!showVideo && (
            <div className={styles.receipt} aria-hidden>
              <span className={styles.receiptTitle}>FISKALNI RAČUN</span>
              <span className={styles.receiptLine} />
              <span className={styles.receiptLine} />
              <span className={cn(styles.receiptLine, styles.short)} />
              <Icon name="scan" size={48} strokeWidth={1.3} className={styles.receiptQr} />
            </div>
          )}
          {!cameraUnavailable && <span className={styles.scanLine} aria-hidden />}
          {loading && <span className={styles.loading}>{t('scan.loading')}</span>}
        </div>
        <p className={styles.hint}>{cameraUnavailable ? t('scan.cameraText') : t('scan.placeHint')}</p>
      </section>

      {scanner.torchSupported && (
        <button type="button" className={styles.torch} onClick={scanner.toggleTorch} aria-pressed={scanner.torchOn}>
          <span className={cn(styles.torchIcon, scanner.torchOn && styles.torchOn)}>
            <Icon name="flash" size={22} />
          </span>
          {scanner.torchOn ? t('scan.torchOff') : t('scan.torchOn')}
        </button>
      )}

      <p className={styles.quota}>{t('scan.remaining', { left: quota.remaining, limit: FREE_SCAN_LIMIT })}</p>

      <div className={styles.actions}>
        <Button onClick={() => navigate(routes.add, { replace: true })}>{t('scan.manual')}</Button>
        {import.meta.env.DEV && (
          <Button variant="link" onClick={() => handleCode(demoReceiptUrl())}>
            {t('scan.demo')}
          </Button>
        )}
      </div>

      <p className={styles.privacy}>
        <Icon name="shield" size={18} />
        {t('scan.privacy')}
      </p>

      <ScanErrorSheet
        error={error}
        limitText={t('scan.limitText', { limit: FREE_SCAN_LIMIT, date: fmt.dayMonth(addMonths(startOfMonth(today()), 1)) })}
        onPro={() => navigate(routes.pro)}
        onRetry={() => setError(null)}
        onManual={() => navigate(routes.add, { replace: true })}
      />
    </Page>
  );
}
