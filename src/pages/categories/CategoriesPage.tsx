import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CategoryIconTile, useCategoryName, type Category } from '@/entities/category';
import { CategoryActionsSheet, CategoryEditorSheet } from '@/features/category';
import { useCategories } from '@/store';
import { useI18n } from '@/shared/i18n';
import { Button, ListGroup, ListRow, Page, PageHeader, SectionLabel } from '@/shared/ui';
import styles from './CategoriesPage.module.css';

/** 07 · Категории (+ UI 21–24). */
export function CategoriesPage() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const categories = useCategories();
  const name = useCategoryName();
  const [selected, setSelected] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <Page>
      <PageHeader title={t('categories.title')} onBack={() => navigate(-1)} />

      <div>
        <h2 className={styles.heading}>{t('categories.heading')}</h2>
        <p className={styles.subtitle}>{t('categories.subtitle')}</p>
      </div>

      {[
        { key: 'base', title: t('categories.baseSection'), items: categories.filter((c) => c.builtIn) },
        { key: 'custom', title: t('categories.customSection'), items: categories.filter((c) => !c.builtIn) },
      ]
        .filter((group) => group.items.length > 0)
        .map((group) => (
          <section key={group.key}>
            <SectionLabel>{group.title}</SectionLabel>
            <ListGroup className={styles.list}>
              {group.items.map((c) => (
                <ListRow
                  key={c.id}
                  leading={<CategoryIconTile icon={c.icon} color={c.color} />}
                  title={name.full(c)}
                  chevron
                  onClick={() => setSelected(c)}
                />
              ))}
            </ListGroup>
          </section>
        ))}

      <p className={styles.hint}>{t('categories.hint')}</p>

      <Button onClick={() => setCreating(true)}>{t('categories.add')}</Button>

      <CategoryActionsSheet category={selected} onClose={() => setSelected(null)} />
      <CategoryEditorSheet open={creating} onClose={() => setCreating(false)} />
    </Page>
  );
}
