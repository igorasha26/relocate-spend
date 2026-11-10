import type { ReactNode } from 'react';
import { cn } from '@/shared/lib/cn';
import { Icon } from '../Icon';
import styles from './OptionList.module.css';

export interface Option<T extends string> {
  value: T;
  title: ReactNode;
  subtitle?: ReactNode;
  leading?: ReactNode;
  tone?: 'default' | 'accent' | 'danger';
}

interface OptionListProps<T extends string> {
  options: Option<T>[];
  /** Выбранные значения. Пустой массив — список действий без галочек. */
  selected?: T | T[];
  onSelect: (value: T) => void;
  /** cards — отдельные плашки (валюты, тема), grouped — одна карточка с разделителями (категории). */
  variant?: 'cards' | 'grouped';
  multiple?: boolean;
  ariaLabel?: string;
}

export function OptionList<T extends string>({
  options,
  selected,
  onSelect,
  variant = 'cards',
  multiple = false,
  ariaLabel,
}: OptionListProps<T>) {
  const selectedSet = new Set(Array.isArray(selected) ? selected : selected ? [selected] : []);
  const isAction = selected === undefined;
  return (
    <div
      role={isAction ? 'group' : multiple ? 'group' : 'radiogroup'}
      aria-label={ariaLabel}
      className={cn(styles.list, styles[variant])}
    >
      {options.map((option) => {
        const isSelected = selectedSet.has(option.value);
        return (
          <button
            key={option.value}
            type="button"
            role={isAction ? undefined : multiple ? 'checkbox' : 'radio'}
            aria-checked={isAction ? undefined : isSelected}
            className={cn(styles.option, isSelected && styles.selected)}
            onClick={() => onSelect(option.value)}
          >
            {option.leading}
            <span className={styles.text}>
              <span className={cn(styles.title, option.tone && styles[option.tone])}>{option.title}</span>
              {option.subtitle && <span className={styles.subtitle}>{option.subtitle}</span>}
            </span>
            {isSelected && <Icon name="check" size={20} strokeWidth={2.2} className={styles.check} />}
          </button>
        );
      })}
    </div>
  );
}
