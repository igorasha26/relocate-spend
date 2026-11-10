import { useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/shared/lib/cn';
import { Icon, type IconName } from '../Icon';
import styles from './Field.module.css';

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  /** id элемента управления — чтобы label был связан с полем. */
  htmlFor?: string;
  children: ReactNode;
}

/** Подпись над полем + подсказка/ошибка под ним. */
export function Field({ label, hint, error, className, htmlFor, children }: FieldProps) {
  return (
    <div className={cn(styles.field, className)}>
      {label && (
        <label className={styles.label} htmlFor={htmlFor}>
          {label}
        </label>
      )}
      {children}
      {error ? <p className={styles.error}>{error}</p> : hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  trailing?: ReactNode;
  onClear?: () => void;
  clearLabel?: string;
  leadingIcon?: IconName;
}

export function TextInput({ label, hint, trailing, onClear, clearLabel, leadingIcon, className, id, ...rest }: TextInputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const showClear = onClear && String(rest.value ?? '').length > 0;
  return (
    <Field label={label} hint={hint} htmlFor={inputId} className={className}>
      <div className={styles.box}>
        {leadingIcon && <Icon name={leadingIcon} size={20} className={styles.leading} />}
        <input id={inputId} className={styles.input} {...rest} />
        {showClear && (
          <button type="button" className={styles.clear} onClick={onClear} aria-label={clearLabel}>
            <Icon name="close" size={16} strokeWidth={2.2} />
          </button>
        )}
        {trailing}
      </div>
    </Field>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
}

export function TextArea({ label, className, id, rows = 3, ...rest }: TextAreaProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} htmlFor={inputId} className={className}>
      <div className={cn(styles.box, styles.multiline)}>
        <textarea id={inputId} rows={rows} className={styles.input} {...rest} />
      </div>
    </Field>
  );
}

interface PickerFieldProps {
  label?: ReactNode;
  value?: ReactNode;
  placeholder?: string;
  icon?: IconName;
  onClick: () => void;
  className?: string;
}

/** Поле-кнопка, открывающее шторку выбора (категория, дата). */
export function PickerField({ label, value, placeholder, icon = 'chevronDown', onClick, className }: PickerFieldProps) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id} className={className}>
      <button id={id} type="button" className={cn(styles.box, styles.picker)} onClick={onClick}>
        <span className={cn(styles.pickerValue, !value && styles.placeholder)}>{value || placeholder}</span>
        <Icon name={icon} size={icon === 'chevronDown' ? 18 : 20} className={styles.pickerIcon} />
      </button>
    </Field>
  );
}
