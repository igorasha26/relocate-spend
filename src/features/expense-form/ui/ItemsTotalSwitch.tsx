import type { Currency } from '@/shared/config/currency';
import { useI18n } from '@/shared/i18n';
import { Switch } from '@/shared/ui';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  itemsTotal: number;
  /** Сумма расхода, если она ведётся вручную (тумблер выключен). */
  amount: number;
  currency: Currency;
}

/**
 * Единый переключатель «Сумма расхода = сумма позиций» —
 * одинаковый в форме траты и в шторке позиций на экране чека.
 */
export function ItemsTotalSwitch({ checked, onChange, itemsTotal, amount, currency }: Props) {
  const { t, fmt } = useI18n();
  return (
    <Switch
      checked={checked}
      onChange={onChange}
      label={t('item.syncTitle')}
      hint={
        checked
          ? t('item.syncOn', { amount: fmt.money(itemsTotal, currency) })
          : `${t('item.syncOff', { items: fmt.money(itemsTotal, currency), amount: fmt.money(amount, currency) })}. ${t('item.syncOffHint')}`
      }
    />
  );
}
