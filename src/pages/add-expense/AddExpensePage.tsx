import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { emptyDraft, ExpenseForm, useExpenseDraft } from '@/features/expense-form';
import { useActions, useSettings } from '@/store';
import { FEATURES } from '@/shared/config/features';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import { Button, Icon, Page, PageHeader, Sheet, useToast } from '@/shared/ui';
import styles from './AddExpensePage.module.css';

/** 02 · Добавить трату (+ UI 12–14: поля зависят от категории). */
export function AddExpensePage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const toast = useToast();
  const { baseCurrency } = useSettings();
  const { addExpense } = useActions();
  const form = useExpenseDraft(() => emptyDraft(baseCurrency));
  const [soonOpen, setSoonOpen] = useState(false);

  return (
    <Page>
      <PageHeader title={t('form.addTitle')} />
      <ExpenseForm
        form={form}
        submitLabel={t('form.save')}
        header={
          <button
            type="button"
            className={styles.scanBanner}
            onClick={() => (FEATURES.qrScan ? navigate(routes.scan) : setSoonOpen(true))}
          >
            <Icon name="scan" size={30} strokeWidth={1.6} />
            <span className={styles.scanText}>
              <span className={styles.scanTitle}>{t('form.scanTitle')}</span>
              <span className={styles.scanSubtitle}>{t('form.scanText')}</span>
            </span>
            {!FEATURES.qrScan && <span className={styles.soonBadge}>{t('soon.badge')}</span>}
          </button>
        }
        onSubmit={(input) => {
          addExpense(input);
          toast(t('form.saved'));
          navigate(routes.home);
        }}
      />

      {/* Бета-тест: сканирование ещё не подключено — честно говорим «скоро» */}
      <Sheet
        open={soonOpen}
        onClose={() => setSoonOpen(false)}
        title={t('soon.scanTitle')}
        closeLabel={t('common.close')}
        footer={<Button onClick={() => setSoonOpen(false)}>{t('soon.ok')}</Button>}
      >
        <div className={styles.soonIcon} aria-hidden>
          <Icon name="scan" size={34} strokeWidth={1.6} />
        </div>
        <p className={styles.soonText}>{t('soon.scanText')}</p>
      </Sheet>
    </Page>
  );
}
