import { Suspense, useEffect } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { UpdateBanner, WhatsNew } from '@/features/app-update';
import { AuthPromptAuto, useAuthPromptHandled } from '@/features/auth-prompt';
import { InstallPromptAuto } from '@/features/install-prompt';
import { OnboardingAuto, useOnboardingDone } from '@/features/onboarding';
import { analytics } from '@/shared/analytics';
import { useFeature } from '@/shared/config/features';
import { routes } from '@/shared/config/routes';
import { ErrorBoundary } from '../ErrorBoundary';
import styles from './AppLayout.module.css';
import { lazyPage } from './lazyPage';
import { TabBar } from './TabBar';

// Каждый экран грузится отдельным чанком — стартовый бандл не растёт с числом экранов.
const HomePage = lazyPage(() => import('@/pages/home').then((m) => m.HomePage));
const AddExpensePage = lazyPage(() => import('@/pages/add-expense').then((m) => m.AddExpensePage));
const EditExpensePage = lazyPage(() => import('@/pages/edit-expense').then((m) => m.EditExpensePage));
const ExpenseDetailsPage = lazyPage(() => import('@/pages/expense-details').then((m) => m.ExpenseDetailsPage));
const ScanPage = lazyPage(() => import('@/pages/scan').then((m) => m.ScanPage));
const ReceiptReviewPage = lazyPage(() => import('@/pages/receipt-review').then((m) => m.ReceiptReviewPage));
const ProfilePage = lazyPage(() => import('@/pages/profile').then((m) => m.ProfilePage));
const CategoriesPage = lazyPage(() => import('@/pages/categories').then((m) => m.CategoriesPage));
const ProPage = lazyPage(() => import('@/pages/pro').then((m) => m.ProPage));
const LoginPage = lazyPage(() => import('@/pages/auth').then((m) => m.LoginPage));
const SignupPage = lazyPage(() => import('@/pages/auth').then((m) => m.SignupPage));
const ResetPasswordPage = lazyPage(() => import('@/pages/auth').then((m) => m.ResetPasswordPage));
const PrivacyPage = lazyPage(() => import('@/pages/privacy').then((m) => m.PrivacyPage));
const CreateGroupPage = lazyPage(() => import('@/pages/groups').then((m) => m.CreateGroupPage));
const GroupPage = lazyPage(() => import('@/pages/groups').then((m) => m.GroupPage));

/** Экраны без таб-бара (полноэкранные сценарии). */
const FULLSCREEN: string[] = [routes.scan, routes.login, routes.signup, routes.resetPassword, routes.privacy, routes.groupNew];

/** Имя экрана для аналитики: id расходов не отправляем. */
const screenName = (pathname: string) =>
  pathname.replace(/\/expense\/[^/]+/, '/expense/:id').replace(/\/groups\/(?!new)[^/]+/, '/groups/:id');

export function AppLayout() {
  const { pathname } = useLocation();
  const showTabBar = !FULLSCREEN.includes(pathname);
  const onboardingDone = useOnboardingDone();
  const authPromptHandled = useAuthPromptHandled();
  // Окна по очереди: обучение → предложение аккаунта → «На главный экран» / «Что нового»
  const calm = showTabBar && onboardingDone;
  const qrScan = useFeature('qrScan');
  const pro = useFeature('pro');

  useEffect(() => analytics.page(screenName(pathname)), [pathname]);

  return (
    <div className={styles.app}>
      <main className={showTabBar ? styles.withTabBar : styles.fullscreen}>
        {/* key — после ошибки на одном экране переход на другой снова работает */}
        <ErrorBoundary key={pathname}>
          <Suspense fallback={null}>
            {/* key по пути — экран монтируется заново и проигрывает анимацию появления */}
            <div key={pathname} className="page-enter">
              <Routes>
                <Route path={routes.home} element={<HomePage />} />
                <Route path={routes.add} element={<AddExpensePage />} />
                <Route path="/expense/:id" element={<ExpenseDetailsPage />} />
                <Route path="/expense/:id/edit" element={<EditExpensePage />} />
                {/* Выключенные функции: прямые ссылки уводят на рабочие экраны */}
                <Route path={routes.scan} element={qrScan ? <ScanPage /> : <Navigate to={routes.add} replace />} />
                <Route
                  path={routes.scanReview}
                  element={qrScan ? <ReceiptReviewPage /> : <Navigate to={routes.add} replace />}
                />
                <Route path={routes.profile} element={<ProfilePage />} />
                <Route path={routes.categories} element={<CategoriesPage />} />
                <Route path={routes.pro} element={pro ? <ProPage /> : <Navigate to={routes.profile} replace />} />
                <Route path={routes.login} element={<LoginPage />} />
                <Route path={routes.signup} element={<SignupPage />} />
                <Route path={routes.resetPassword} element={<ResetPasswordPage />} />
                <Route path={routes.privacy} element={<PrivacyPage />} />
                <Route path={routes.groupNew} element={<CreateGroupPage />} />
                <Route path="/groups/:id" element={<GroupPage />} />
                <Route path="*" element={<Navigate to={routes.home} replace />} />
              </Routes>
            </div>
          </Suspense>
        </ErrorBoundary>
      </main>
      {showTabBar && <TabBar />}
      <UpdateBanner />
      <OnboardingAuto />
      <AuthPromptAuto enabled={calm} />
      <InstallPromptAuto enabled={calm && authPromptHandled} />
      <WhatsNew enabled={calm && authPromptHandled} />
    </div>
  );
}
