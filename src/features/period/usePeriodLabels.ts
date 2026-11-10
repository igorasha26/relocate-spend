import { useI18n, type TranslationKey } from '@/shared/i18n';
import { parseISODate } from '@/shared/lib/date';
import { monthIndexOf, type Period } from './model';

const MONTH_IN_KEYS = Array.from({ length: 12 }, (_, i) => `monthIn.m${i}`) as TranslationKey[];

/** Подписи периода для шапки, итогов и сравнения. */
export function usePeriodLabels() {
  const { t, fmt } = useI18n();

  const title = (p: Period) => {
    switch (p.kind) {
      case 'month':
        return fmt.monthYear(p.start);
      case 'year':
        return String(parseISODate(p.start).getFullYear());
      default:
        return fmt.range(p.start, p.end);
    }
  };

  const totalLabel = (p: Period) =>
    ({ week: t('home.totalWeek'), month: t('home.totalMonth'), year: t('home.totalYear'), custom: t('home.totalCustom') })[p.kind];

  /** «в октябре», «на прошлой неделе», «в 2025» */
  const previousLabel = (prev: Period) => {
    switch (prev.kind) {
      case 'week':
        return t('home.prevWeek');
      case 'month':
        return t('home.prevMonth', { month: t(MONTH_IN_KEYS[monthIndexOf(prev.start)]!) });
      case 'year':
        return t('home.prevYear', { year: parseISODate(prev.start).getFullYear() });
      case 'custom':
        return t('home.prevCustom');
    }
  };

  /** Подпись в центре кольцевой диаграммы: «Расходы / ноября». */
  const centerCaption = (p: Period) => {
    switch (p.kind) {
      case 'month':
        return fmt.monthGenitive(p.start);
      case 'week':
        return t('home.centerWeek');
      case 'year':
        return t('home.centerYear', { year: parseISODate(p.start).getFullYear() });
      case 'custom':
        return t('home.centerCustom');
    }
  };

  /** «в ноябре» — для «отсканировано в ноябре». */
  const monthIn = (date: string) => t(MONTH_IN_KEYS[monthIndexOf(date)]!);

  return { title, totalLabel, previousLabel, centerCaption, monthIn };
}
