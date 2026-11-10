import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { routes } from '@/shared/config/routes';
import { ErrorBoundary } from '../ErrorBoundary';
import styles from './AppLayout.module.css';
import { TabBar } from './TabBar';

// Каждый экран грузится отдельным чанком — стартовый бандл не растёт с числом экранов.
const HomePage = lazy(() => import('@/pages/home').then((m) => ({ default: m.HomePage })));
const AddExpensePage = lazy(() => import('@/pages/add-expense').then((m) => ({ default: m.AddExpensePage })));
const EditExpensePage = lazy(() => import('@/pages/edit-expense').then((m) => ({ default: m.EditExpensePage })));
const ExpenseDetailsPage = lazy(() => import('@/pages/expense-details').then((m) => ({ default: m.ExpenseDetailsPage })));
const ScanPage = lazy(() => import('@/pages/scan').then((m) => ({ default: m.ScanPage })));
const ReceiptReviewPage = lazy(() => import('@/pages/receipt-review').then((m) => ({ default: m.ReceiptReviewPage })));
const ProfilePage = lazy(() => import('@/pages/profile').then((m) => ({ default: m.ProfilePage })));
const CategoriesPage = lazy(() => import('@/pages/categories').then((m) => ({ default: m.CategoriesPage })));
const ProPage = lazy(() => import('@/pages/pro').then((m) => ({ default: m.ProPage })));

/** Экраны без таб-бара (полноэкранные сценарии). */
const FULLSCREEN: string[] = [routes.scan];

export function AppLayout() {
  const { pathname } = useLocation();
  const showTabBar = !FULLSCREEN.includes(pathname);

  return (
    <div className={styles.app}>
      <main className={showTabBar ? styles.withTabBar : styles.fullscreen}>
        <ErrorBoundary>
          <Suspense fallback={null}>
            {/* key по пути — экран монтируется заново и проигрывает анимацию появления */}
            <div key={pathname} className="page-enter">
            <Routes>
              <Route path={routes.home} element={<HomePage />} />
              <Route path={routes.add} element={<AddExpensePage />} />
              <Route path="/expense/:id" element={<ExpenseDetailsPage />} />
              <Route path="/expense/:id/edit" element={<EditExpensePage />} />
              <Route path={routes.scan} element={<ScanPage />} />
              <Route path={routes.scanReview} element={<ReceiptReviewPage />} />
              <Route path={routes.profile} element={<ProfilePage />} />
              <Route path={routes.categories} element={<CategoriesPage />} />
              <Route path={routes.pro} element={<ProPage />} />
              <Route path="*" element={<Navigate to={routes.home} replace />} />
            </Routes>
            </div>
          </Suspense>
        </ErrorBoundary>
      </main>
      {showTabBar && <TabBar />}
    </div>
  );
}
