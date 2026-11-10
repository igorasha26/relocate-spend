import { useI18n } from '@/shared/i18n';
import { addDays, today, type ISODate } from '@/shared/lib/date';

/** «Сегодня, 9 ноября» / «Вчера, 8 ноября» / «7 ноября». */
export function useDayLabel() {
  const { t, fmt } = useI18n();
  return (date: ISODate) => {
    const now = today();
    if (date === now) return t('common.todayDate', { date: fmt.dayMonth(date) });
    if (date === addDays(now, -1)) return t('common.yesterdayDate', { date: fmt.dayMonth(date) });
    return date.slice(0, 4) === now.slice(0, 4) ? fmt.dayMonth(date) : fmt.dayMonthYear(date);
  };
}
