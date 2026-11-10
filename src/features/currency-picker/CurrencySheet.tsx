import { CURRENCIES, type Currency } from '@/shared/config/currency';
import { useI18n } from '@/shared/i18n';
import { OptionList, Sheet } from '@/shared/ui';
import styles from './CurrencySheet.module.css';

interface Props {
  open: boolean;
  value: Currency;
  title: string;
  subtitle?: string;
  note?: string;
  onClose: () => void;
  /** Вызывается сразу при нажатии на валюту — кнопки «Готово» нет. */
  onSubmit: (currency: Currency) => void;
}

/**
 * Выбор валюты. Один компонент на три сценария из макета:
 * валюта отчёта (UI 01), базовая валюта (UI 20), валюта покупки (UI 30).
 * Выбор применяется мгновенно: закрыли крестиком — значит, оставили как было.
 */
export function CurrencySheet({ open, value, title, subtitle, note, onClose, onSubmit }: Props) {
  const { t } = useI18n();
  return (
    <Sheet open={open} onClose={onClose} title={title} subtitle={subtitle} closeLabel={t('common.close')}>
      <OptionList<Currency>
        selected={value}
        onSelect={onSubmit}
        options={CURRENCIES.map((code) => ({ value: code, title: code, subtitle: t(`currency.${code}`) }))}
      />
      {note && <p className={styles.note}>{note}</p>}
    </Sheet>
  );
}
