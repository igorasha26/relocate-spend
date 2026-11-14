import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { emptyDraft, ExpenseForm, useExpenseDraft } from '@/features/expense-form';
import { SpaceTarget } from '@/features/groups';
import { groupSpace, useActions, useSettings, useSpace } from '@/store';
import { analytics } from '@/shared/analytics';
import { useFeature } from '@/shared/config/features';
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
  const qrScan = useFeature('qrScan');
  // Куда записать: по умолчанию — группа, открытая на главной, иначе личные
  const { space, setSpace, targetGroupId, groups } = useSpace();
  const [target, setTarget] = useState<string | null>(targetGroupId);
  const targetName = groups.find((g) => g.id === target)?.name;

  return (
    <Page>
      <PageHeader title={t('form.addTitle')} />
      <ExpenseForm
        form={form}
        submitLabel={t('form.save')}
        header={
          <>
          <button
            type="button"
            className={styles.scanBanner}
            onClick={() => {
              if (qrScan) {
                navigate(routes.scan);
              } else {
                analytics.track('scan_soon_tapped'); // насколько ждут сканер
                setSoonOpen(true);
              }
            }}
          >
            <Icon name="scan" size={30} strokeWidth={1.6} />
            <span className={styles.scanText}>
              <span className={styles.scanTitle}>{t('form.scanTitle')}</span>
              <span className={styles.scanSubtitle}>{t('form.scanText')}</span>
            </span>
            {!qrScan && <span className={styles.soonBadge}>{t('soon.badge')}</span>}
          </button>
          <SpaceTarget value={target} onChange={setTarget} />
          </>
        }
        onSubmit={(input) => {
          addExpense({ ...input, groupId: targetName ? target! : undefined });
          // на главной должна быть видна только что добавленная трата
          if (space !== 'all') setSpace(targetName ? groupSpace(target!) : 'personal');
          toast(targetName ? t('space.savedTo', { group: targetName }) : t('form.saved'));
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
