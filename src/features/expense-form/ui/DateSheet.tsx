import { useEffect, useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { today, type ISODate } from '@/shared/lib/date';
import { Button, Calendar, Sheet } from '@/shared/ui';
import styles from './DateSheet.module.css';

interface Props {
  open: boolean;
  value: ISODate;
  onClose: () => void;
  onSubmit: (date: ISODate) => void;
}

/** UI 10 · Дата расхода. Будущие даты недоступны. */
export function DateSheet({ open, value, onClose, onSubmit }: Props) {
  const { t, fmt } = useI18n();
  const [date, setDate] = useState(value);
  const [calendarKey, setCalendarKey] = useState(0);

  useEffect(() => {
    if (open) setDate(value);
  }, [open, value]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('form.dateTitle')}
      closeLabel={t('common.close')}
      footer={<Button onClick={() => onSubmit(date)}>{t('form.pickDate', { date: fmt.dayMonth(date) })}</Button>}
    >
      <div className={styles.top}>
        <Button
          variant="link"
          onClick={() => {
            setDate(today());
            setCalendarKey((k) => k + 1); // перелистываем календарь на текущий месяц
          }}
        >
          {t('common.today')}
        </Button>
        <span className={styles.current}>{fmt.dayMonthYear(date)}</span>
      </div>
      <Calendar key={calendarKey} mode="single" value={date} maxDate={today()} onChange={setDate} />
      <p className={styles.note}>{t('form.dateNote')}</p>
    </Sheet>
  );
}
