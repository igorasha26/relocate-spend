import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { IconButton, Segmented } from '@/shared/ui';
import { isFuture, periodFor, shiftPeriod, switchKind, type Period, type PeriodKind } from '../model';
import { usePeriodLabels } from '../usePeriodLabels';
import { MonthYearSheet } from './MonthYearSheet';
import styles from './PeriodNavigator.module.css';
import { PeriodSheet } from './PeriodSheet';

interface Props {
  period: Period;
  onChange: (period: Period) => void;
}

/** Строка «‹ Ноябрь 2026 › [календарь]» + переключатель Неделя/Месяц/Год. */
export function PeriodNavigator({ period, onChange }: Props) {
  const { t } = useI18n();
  const labels = usePeriodLabels();
  const [sheet, setSheet] = useState<'period' | 'monthYear' | null>(null);

  const kinds: { value: PeriodKind; label: string }[] = [
    { value: 'week', label: t('period.week') },
    { value: 'month', label: t('period.month') },
    { value: 'year', label: t('period.year') },
  ];

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <IconButton icon="chevronLeft" label={t('period.prev')} onClick={() => onChange(shiftPeriod(period, -1))} />
        <button
          type="button"
          className={styles.title}
          onClick={() => setSheet(period.kind === 'month' ? 'monthYear' : 'period')}
        >
          {labels.title(period)}
        </button>
        <IconButton
          icon="chevronRight"
          label={t('period.next')}
          disabled={isFuture(shiftPeriod(period, 1))}
          onClick={() => onChange(shiftPeriod(period, 1))}
        />
        <IconButton icon="calendar" variant="tile" label={t('period.openPicker')} className={styles.calendar} onClick={() => setSheet('period')} />
      </div>

      <Segmented
        value={period.kind}
        options={kinds}
        ariaLabel={t('period.sheetTitle')}
        onChange={(kind) => {
          if (kind !== 'custom' && kind !== period.kind) onChange(switchKind(period, kind));
        }}
      />

      <PeriodSheet
        open={sheet === 'period'}
        period={period}
        onClose={() => setSheet(null)}
        onApply={(p) => {
          onChange(p);
          setSheet(null);
        }}
      />
      <MonthYearSheet
        open={sheet === 'monthYear'}
        value={period.start}
        onClose={() => setSheet(null)}
        onApply={(date) => {
          onChange(periodFor('month', date));
          setSheet(null);
        }}
      />
    </div>
  );
}
