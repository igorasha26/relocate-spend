import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { Page, PageHeader } from '@/shared/ui';
import { authFormStyles as styles } from '@/features/auth';

interface Props {
  title: string;
  lead: ReactNode;
  onBack?: () => void;
  children: ReactNode;
}

/** Общий каркас экранов входа: шапка «Назад», пояснение, форма. */
export function AuthShell({ title, lead, onBack, children }: Props) {
  const navigate = useNavigate();
  const back = onBack ?? (() => (window.history.length > 1 ? navigate(-1) : navigate(routes.profile)));
  return (
    <Page>
      <PageHeader title={title} onBack={back} />
      <p className={styles.lead}>{lead}</p>
      {children}
    </Page>
  );
}

/** «Мы отправили код на <b>почта</b>» — почту выделяем, остальное из перевода. */
export function withEmail(template: string, email: string): ReactNode {
  const [before, after] = template.split('{email}');
  return (
    <>
      {before}
      <b>{email}</b>
      {after}
    </>
  );
}
