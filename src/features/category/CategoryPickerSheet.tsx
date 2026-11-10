import { useEffect, useState } from 'react';
import { CategoryDot, useCategoryName } from '@/entities/category';
import { useCategories } from '@/store';
import { useI18n } from '@/shared/i18n';
import { Button, Icon, OptionList, Sheet, TextInput } from '@/shared/ui';
import { CategoryEditorSheet } from './CategoryEditorSheet';
import styles from './CategoryPickerSheet.module.css';

interface BaseProps {
  open: boolean;
  onClose: () => void;
  /** Показывать ссылку «Создать категорию». */
  allowCreate?: boolean;
}

interface SingleProps extends BaseProps {
  multiple?: false;
  value: string | null;
  onSubmit: (categoryId: string) => void;
}

interface MultipleProps extends BaseProps {
  multiple: true;
  value: string[];
  onSubmit: (categoryIds: string[]) => void;
}

/** UI 09 · Выбор категории (одной или нескольких — для фильтров). */
export function CategoryPickerSheet(props: SingleProps | MultipleProps) {
  const { open, onClose, allowCreate = true } = props;
  const { t } = useI18n();
  const categories = useCategories();
  const name = useCategoryName();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setSelected(props.multiple ? props.value : props.value ? [props.value] : []);
    // props.value синхронизируем только при открытии
  }, [open]);

  const q = query.trim().toLocaleLowerCase();
  const visible = categories.filter((c) => !q || name.full(c).toLocaleLowerCase().includes(q));

  const toggle = (id: string) => {
    if (props.multiple) {
      setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    } else {
      // Одиночный выбор применяется сразу по нажатию — как и валюта
      props.onSubmit(id);
    }
  };

  const submit = () => {
    if (props.multiple) props.onSubmit(selected);
  };

  return (
    <>
      <Sheet
        open={open && !creating}
        onClose={onClose}
        title={t('categoryPicker.title')}
        closeLabel={t('common.close')}
        headerAction={
          props.multiple && selected.length > 0 ? (
            <Button variant="link" onClick={() => setSelected([])}>
              {t('common.reset')}
            </Button>
          ) : undefined
        }
        footer={props.multiple ? <Button onClick={submit}>{t('categoryPicker.apply')}</Button> : undefined}
      >
        <TextInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('categoryPicker.search')}
          aria-label={t('categoryPicker.search')}
          onClear={() => setQuery('')}
          clearLabel={t('search.clear')}
          className={styles.search}
        />
        {visible.length > 0 ? (
          <OptionList<string>
            variant="grouped"
            multiple={props.multiple}
            selected={selected}
            onSelect={toggle}
            options={visible.map((c) => ({ value: c.id, title: name.full(c), leading: <CategoryDot color={c.color} /> }))}
          />
        ) : (
          <p className={styles.empty}>{t('categoryPicker.nothing')}</p>
        )}
        {allowCreate && (
          <button type="button" className={styles.create} onClick={() => setCreating(true)}>
            <Icon name="plus" size={18} strokeWidth={2.2} />
            {t('categoryPicker.create')}
          </button>
        )}
      </Sheet>

      <CategoryEditorSheet
        open={open && creating}
        initialName={query}
        onClose={() => setCreating(false)}
        onSaved={(category) => {
          setCreating(false);
          toggle(category.id);
        }}
      />
    </>
  );
}
