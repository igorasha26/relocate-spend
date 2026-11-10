import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { parseISODate, toISODate, today, type ISODate } from '@/shared/lib/date';
import { Button, Sheet } from '@/shared/ui';
import styles from './MonthYearSheet.module.css';

const ROW = 44;
const FIRST_YEAR = 2020;

interface WheelProps {
  items: string[];
  index: number;
  onChange: (index: number) => void;
  label: string;
}

/** Колесо выбора в стиле iOS на scroll-snap. */
function Wheel({ items, index, onChange, label }: WheelProps) {
  const ref = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ROW) !== index) el.scrollTo({ top: index * ROW });
  }, [index]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <div
      ref={ref}
      className={styles.wheel}
      role="listbox"
      aria-label={label}
      tabIndex={0}
      onScroll={(event) => {
        const el = event.currentTarget;
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => {
          const next = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ROW)));
          if (next !== index) onChange(next);
        }, 90);
      }}
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown') onChange(Math.min(items.length - 1, index + 1));
        if (event.key === 'ArrowUp') onChange(Math.max(0, index - 1));
      }}
    >
      {items.map((item, i) => (
        <button
          key={item}
          type="button"
          role="option"
          aria-selected={i === index}
          tabIndex={-1}
          className={cn(styles.item, i === index && styles.selected, Math.abs(i - index) >= 2 && styles.far)}
          onClick={() => onChange(i)}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

interface Props {
  open: boolean;
  value: ISODate;
  onClose: () => void;
  onApply: (firstDayOfMonth: ISODate) => void;
}

/** UI 04 · Месяц и год. */
export function MonthYearSheet({ open, value, onClose, onApply }: Props) {
  const { t, fmt } = useI18n();
  const now = parseISODate(today());
  const years = Array.from({ length: now.getFullYear() - FIRST_YEAR + 1 }, (_, i) => String(FIRST_YEAR + i));
  const months = Array.from({ length: 12 }, (_, i) => fmt.monthName(i));
  const [month, setMonth] = useState(0);
  const [yearIndex, setYearIndex] = useState(0);

  // Будущие месяцы выбрать нельзя — расходов там ещё нет
  const selected = toISODate(new Date(Number(years[yearIndex]), month, 1));

  useEffect(() => {
    if (!open) return;
    const d = parseISODate(value);
    setMonth(d.getMonth());
    setYearIndex(Math.max(0, years.indexOf(String(d.getFullYear()))));
    // Синхронизируем колёса со значением только при открытии шторки.
  }, [open, value]);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('period.monthYearTitle')}
      subtitle={t('period.monthYearSubtitle')}
      closeLabel={t('common.close')}
      footer={
        <Button disabled={selected > today()} onClick={() => onApply(selected)}>
          {t('period.goToMonth')}
        </Button>
      }
    >
      <div className={styles.wheels}>
        <div className={styles.band} aria-hidden />
        <Wheel items={months} index={month} onChange={setMonth} label={t('period.month')} />
        <Wheel items={years} index={yearIndex} onChange={setYearIndex} label={t('period.year')} />
      </div>
      <p className={styles.note}>{t('period.currentMonth', { month: fmt.monthYear(today()).toLocaleLowerCase() })}</p>
    </Sheet>
  );
}
