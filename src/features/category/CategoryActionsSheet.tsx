import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FALLBACK_CATEGORY_ID, useCategoryName, type Category } from '@/entities/category';
import { useActions, useCategory } from '@/store';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import { AlertDialog, OptionList, Sheet } from '@/shared/ui';
import { CategoryEditorSheet } from './CategoryEditorSheet';
import styles from './CategoryActionsSheet.module.css';

type ActionId = 'edit' | 'show' | 'delete';

interface Props {
  category: Category | null;
  onClose: () => void;
}

/** UI 21 · Действия с категорией → редактирование (UI 23) / удаление (UI 24). */
export function CategoryActionsSheet({ category, onClose }: Props) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { removeCategory } = useActions();
  const name = useCategoryName();
  const fallback = useCategory(FALLBACK_CATEGORY_ID);
  const [mode, setMode] = useState<'actions' | 'edit' | 'delete'>('actions');

  const open = category !== null;
  // Базовые категории остаются всегда; удалять можно только созданные самостоятельно
  const canDelete = Boolean(category && !category.builtIn && category.id !== FALLBACK_CATEGORY_ID);
  const close = () => {
    setMode('actions');
    onClose();
  };

  const actions: { value: ActionId; title: string; tone: 'accent' | 'danger' }[] = [
    { value: 'edit', title: t('categories.actionEdit'), tone: 'accent' },
    { value: 'show', title: t('categories.actionShow'), tone: 'accent' },
    ...(canDelete ? [{ value: 'delete' as const, title: t('categories.actionDelete'), tone: 'danger' as const }] : []),
  ];

  const onAction = (action: ActionId) => {
    if (!category) return;
    if (action === 'edit') setMode('edit');
    if (action === 'delete') setMode('delete');
    if (action === 'show') {
      close();
      navigate(routes.homeWithCategory(category.id));
    }
  };

  return (
    <>
      <Sheet
        open={open && mode === 'actions'}
        onClose={close}
        title={name.full(category ?? undefined)}
        subtitle={t('categories.actionsSubtitle')}
        closeLabel={t('common.close')}
      >
        <OptionList<ActionId> options={actions} onSelect={onAction} />
        <p className={styles.note}>
          {canDelete ? t('categories.deleteNote', { fallback: name.full(fallback) }) : t('categories.systemNote')}
        </p>
      </Sheet>

      <CategoryEditorSheet open={open && mode === 'edit'} category={category ?? undefined} onClose={close} />

      <AlertDialog
        open={open && mode === 'delete'}
        onClose={() => setMode('actions')}
        title={t('categories.deleteTitle')}
        message={t('categories.deleteText', { name: name.full(category ?? undefined), fallback: name.full(fallback) })}
        actions={[
          {
            label: t('categories.deleteConfirm'),
            tone: 'danger',
            onClick: () => {
              if (category) removeCategory(category.id);
              close();
            },
          },
          { label: t('common.cancel'), onClick: () => setMode('actions') },
        ]}
      />
    </>
  );
}
