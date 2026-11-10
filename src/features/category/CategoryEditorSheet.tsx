import { useEffect, useState, type CSSProperties } from 'react';
import {
  CATEGORY_COLORS,
  CATEGORY_ICONS,
  CategoryIconTile,
  useCategoryName,
  type Category,
  type CategoryColor,
  type CategoryIcon,
} from '@/entities/category';
import { useActions } from '@/store';
import { useI18n } from '@/shared/i18n';
import { cn } from '@/shared/lib/cn';
import { Button, Icon, SectionLabel, Sheet, TextInput } from '@/shared/ui';
import styles from './CategoryEditorSheet.module.css';

interface Props {
  open: boolean;
  /** Если передана — режим редактирования (UI 23), иначе создание (UI 22). */
  category?: Category;
  initialName?: string;
  onClose: () => void;
  onSaved?: (category: Category) => void;
}

const NAME_MAX = 40;

export function CategoryEditorSheet({ open, category, initialName = '', onClose, onSaved }: Props) {
  const { t } = useI18n();
  const { addCategory, updateCategory } = useActions();
  const categoryName = useCategoryName();
  const [name, setName] = useState('');
  const [color, setColor] = useState<CategoryColor>('c1');
  const [icon, setIcon] = useState<CategoryIcon>('doc');

  useEffect(() => {
    if (!open) return;
    setName(category ? categoryName.full(category) : initialName);
    setColor(category?.color ?? 'c1');
    setIcon(category?.icon ?? 'doc');
  }, [open, category, initialName, categoryName]);

  const trimmed = name.trim();

  const save = () => {
    if (!trimmed) return;
    if (category) {
      // У стандартной категории не сохраняем имя, если его не меняли, — тогда оно продолжит переводиться.
      const translated = category.builtIn && !category.name ? categoryName.full(category) : undefined;
      const nextName = trimmed === translated ? undefined : trimmed;
      updateCategory(category.id, { name: nextName, color, icon });
      onSaved?.({ ...category, name: nextName, color, icon });
    } else {
      // Важно: сначала создать, потом сообщить. В `onSaved?.(addCategory(...))`
      // при отсутствии onSaved аргумент не вычисляется — категория не создавалась.
      const created = addCategory({ name: trimmed, color, icon });
      onSaved?.(created);
    }
    onClose();
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={category ? t('categories.editTitle') : t('categories.newTitle')}
      closeLabel={t('common.close')}
      footer={
        <Button disabled={!trimmed} onClick={save}>
          {category ? t('categories.save') : t('categories.create')}
        </Button>
      }
    >
      <TextInput
        label={t('categories.name')}
        value={name}
        maxLength={NAME_MAX}
        placeholder={t('categories.namePlaceholder')}
        onChange={(e) => setName(e.target.value)}
        // Enter только прячет клавиатуру: после названия обычно выбирают цвет и значок
        enterKeyHint="done"
        onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
        className={styles.name}
      />

      <SectionLabel>{t('categories.color')}</SectionLabel>
      <div className={styles.colors} role="radiogroup" aria-label={t('categories.color')}>
        {CATEGORY_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            role="radio"
            aria-checked={c === color}
            aria-label={c}
            className={cn(styles.swatch, c === color && styles.swatchSelected)}
            style={{ '--swatch': `var(--cat-${c})` } as CSSProperties}
            onClick={() => setColor(c)}
          >
            {c === color && <Icon name="check" size={16} strokeWidth={2.6} />}
          </button>
        ))}
      </div>

      <SectionLabel>{t('categories.icon')}</SectionLabel>
      <div className={styles.icons} role="radiogroup" aria-label={t('categories.icon')}>
        {CATEGORY_ICONS.map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={i === icon}
            aria-label={i}
            className={cn(styles.iconOption, i === icon && styles.iconSelected)}
            onClick={() => setIcon(i)}
          >
            <Icon name={i} size={24} />
          </button>
        ))}
      </div>

      <div className={styles.preview}>
        <CategoryIconTile icon={icon} color={color} />
        <div>
          <p className={styles.previewName}>{trimmed || t('categories.previewFallback')}</p>
          <p className={styles.previewHint}>{t('categories.previewHint')}</p>
        </div>
      </div>
    </Sheet>
  );
}
