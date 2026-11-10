import { useState } from 'react';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { addMonths, monthGrid, parseISODate, startOfMonth, today, type ISODate } from '@/shared/lib/date';
import { IconButton } from '../IconButton/IconButton';
import { Pager } from '../Pager/Pager';
import styles from './Calendar.module.css';

interface BaseProps {
  /** Какой месяц показать при открытии. */
  initialMonth?: ISODate;
  maxDate?: ISODate;
}

interface SingleProps extends BaseProps {
  mode: 'single';
  value: ISODate;
  onChange: (date: ISODate) => void;
}

interface RangeProps extends BaseProps {
  mode: 'range';
  start: ISODate | null;
  end: ISODate | null;
  onChange: (range: { start: ISODate | null; end: ISODate | null }) => void;
}

type CalendarProps = SingleProps | RangeProps;

/**
 * Календарь с листанием месяцев свайпом, как страниц:
 * соседние месяцы уже отрисованы и плавно выезжают за пальцем.
 */
export function Calendar(props: CalendarProps) {
  const { fmt, t } = useI18n();
  const initial = props.initialMonth ?? (props.mode === 'single' ? props.value : (props.start ?? today()));
  const [month, setMonth] = useState(() => startOfMonth(initial));
  const todayISO = today();
  const nextDisabled = Boolean(props.maxDate && addMonths(month, 1) > props.maxDate);

  const handleDay = (date: ISODate) => {
    if (props.mode === 'single') {
      props.onChange(date);
      return;
    }
    const { start, end } = props;
    // Первый клик — начало, второй — конец (с автоматической перестановкой).
    if (!start || end) props.onChange({ start: date, end: null });
    else if (date < start) props.onChange({ start: date, end: start });
    else props.onChange({ start, end: date });
  };

  const stateOf = (date: ISODate) => {
    if (props.mode === 'single') return { edge: date === props.value, inside: false };
    const { start, end } = props;
    return { edge: date === start || date === end, inside: Boolean(start && end && date > start && date < end) };
  };

  const renderMonth = (m: ISODate, interactive: boolean) => {
    const d = parseISODate(m);
    return (
      <div className={styles.grid} role={interactive ? 'grid' : undefined} aria-label={interactive ? fmt.monthYear(m) : undefined}>
        {monthGrid(d.getFullYear(), d.getMonth())
          .flat()
          .map((date, index) => {
            if (!date) return <span key={`empty-${index}`} className={styles.empty} />;
            const { edge, inside } = stateOf(date);
            const disabled = Boolean(props.maxDate && date > props.maxDate);
            return (
              <button
                key={date}
                type="button"
                role={interactive ? 'gridcell' : undefined}
                tabIndex={interactive ? undefined : -1}
                aria-selected={interactive ? edge || inside : undefined}
                aria-current={date === todayISO ? 'date' : undefined}
                disabled={disabled}
                className={cn(styles.day, edge && styles.edge, inside && styles.inside, date === todayISO && styles.today)}
                onClick={() => handleDay(date)}
              >
                {parseISODate(date).getDate()}
              </button>
            );
          })}
      </div>
    );
  };

  return (
    <div className={styles.calendar}>
      <div className={styles.header}>
        <span className={styles.month}>{fmt.monthYear(month)}</span>
        <IconButton
          icon="chevronLeft"
          label={t('period.prev')}
          className={styles.nav}
          size={20}
          onClick={() => setMonth(addMonths(month, -1))}
        />
        <IconButton
          icon="chevronRight"
          label={t('period.next')}
          className={styles.nav}
          size={20}
          disabled={nextDisabled}
          onClick={() => setMonth(addMonths(month, 1))}
        />
      </div>

      <div className={styles.weekdays} aria-hidden>
        {fmt.weekdaysShort().map((day) => (
          <span key={day}>{day.toLocaleUpperCase()}</span>
        ))}
      </div>

      <Pager
        pageKey={month}
        canNext={!nextDisabled}
        onChange={(dir) => setMonth(addMonths(month, dir))}
        prev={renderMonth(addMonths(month, -1), false)}
        current={renderMonth(month, true)}
        next={nextDisabled ? null : renderMonth(addMonths(month, 1), false)}
      />
    </div>
  );
}
