import { useEffect, useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { Button, OptionList, Sheet } from '@/shared/ui';
import { periodFor, type Period } from '../model';
import { RangeSheet } from './RangeSheet';
import styles from './PeriodSheet.module.css';

type Choice = 'month' | 'week' | 'year' | 'custom';

interface Props {
  open: boolean;
  period: Period;
  onClose: () => void;
  onApply: (period: Period) => void;
}

/** UI 02 · Выбор периода. */
export function PeriodSheet({ open, period, onClose, onApply }: Props) {
  const { t, fmt } = useI18n();
  const [choice, setChoice] = useState<Choice>(period.kind);
  const [rangeOpen, setRangeOpen] = useState(false);

  useEffect(() => {
    if (open) setChoice(period.kind);
  }, [open, period.kind]);

  const presets: Record<Exclude<Choice, 'custom'>, Period> = {
    month: periodFor('month'),
    week: periodFor('week'),
    year: periodFor('year'),
  };
  const rangeText = (p: Period) => {
    if (p.kind === 'year') return `${fmt.dayMonth(p.start)} – ${fmt.dayMonthYear(p.end)}`;
    const sameYear = p.start.slice(0, 4) === p.end.slice(0, 4);
    return sameYear ? `${fmt.range(p.start, p.end)} ${p.end.slice(0, 4)}` : fmt.range(p.start, p.end);
  };

  return (
    <>
      <Sheet
        open={open && !rangeOpen}
        onClose={onClose}
        title={t('period.sheetTitle')}
        closeLabel={t('common.close')}
        footer={
          <Button
            onClick={() => (choice === 'custom' ? setRangeOpen(true) : onApply(presets[choice]))}
          >
            {t('period.apply')}
          </Button>
        }
      >
        <OptionList<Choice>
          selected={choice}
          onSelect={(value) => (value === 'custom' ? setRangeOpen(true) : setChoice(value))}
          options={[
            { value: 'month', title: t('period.thisMonth'), subtitle: rangeText(presets.month) },
            { value: 'week', title: t('period.thisWeek'), subtitle: rangeText(presets.week) },
            { value: 'year', title: t('period.thisYear'), subtitle: rangeText(presets.year) },
            {
              value: 'custom',
              title: t('period.custom'),
              subtitle: period.kind === 'custom' ? rangeText(period) : t('period.customHint'),
            },
          ]}
        />
        <p className={styles.note}>{t('period.compareNote')}</p>
      </Sheet>

      <RangeSheet
        open={open && rangeOpen}
        initial={period}
        onClose={() => setRangeOpen(false)}
        onApply={(p) => {
          setRangeOpen(false);
          onApply(p);
        }}
      />
    </>
  );
}
