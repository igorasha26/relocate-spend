import { useNavigate } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { useI18n } from '@/shared/i18n';
import { Button, EmptyState, Page, PageHeader } from '@/shared/ui';

export function ExpenseNotFound() {
  const { t } = useI18n();
  const navigate = useNavigate();
  return (
    <Page>
      <PageHeader title={t('details.title')} onBack={() => navigate(routes.home)} />
      <EmptyState
        icon="receipt"
        title={t('details.notFound')}
        text={t('details.notFoundText')}
        actions={<Button onClick={() => navigate(routes.home)}>{t('details.toHome')}</Button>}
      />
    </Page>
  );
}
