import { useEffect, useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { today, type ISODate } from '@/shared/lib/date';
import { Button, Calendar, Sheet } from '@/shared/ui';
import { customPeriod, type Period } from '../model';
import styles from './RangeSheet.module.css';

interface Props {
  open: boolean;
  initial: Period;
  onClose: () => void;
  onApply: (period: Period) => void;
}

/** UI 03 · Календарь своего периода. */
export function RangeSheet({ open, initial, onClose, onApply }: Props) {
  const { t, fmt } = useI18n();
  const [range, setRange] = useState<{ start: ISODate | null; end: ISODate | null }>({ start: null, end: null });

  useEffect(() => {
    if (open) setRange(initial.kind === 'custom' ? { start: initial.start, end: initial.end } : { start: null, end: null });
  }, [open, initial]);

  const ready = range.start && range.end;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('period.custom')}
      subtitle={t('period.rangeSubtitle')}
      closeLabel={t('common.close')}
      footer={
        <Button disabled={!ready} onClick={() => ready && onApply(customPeriod(range.start!, range.end!))}>
          {ready ? t('period.showRange', { range: fmt.range(range.start!, range.end!) }) : t('period.pickEnd')}
        </Button>
      }
    >
      <div className={styles.summary}>
        <div className={styles.cell}>
          <span className={styles.caption}>{t('period.start')}</span>
          <span className={cn(styles.value, !range.end && range.start && styles.active)}>
            {range.start ? fmt.dayMonthShortYear(range.start) : '—'}
          </span>
        </div>
        <div className={styles.cell}>
          <span className={styles.caption}>{t('period.end')}</span>
          <span className={cn(styles.value, styles.endValue)}>{range.end ? fmt.dayMonthShortYear(range.end) : '—'}</span>
        </div>
      </div>
      <Calendar
        mode="range"
        start={range.start}
        end={range.end}
        maxDate={today()}
        initialMonth={initial.start > today() ? today() : initial.start}
        onChange={setRange}
      />
    </Sheet>
  );
}
