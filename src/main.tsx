import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { startUpdateChecks } from './features/app-update';
import { analytics } from './shared/analytics';
import './app/styles/tokens.css';
import './app/styles/base.css';

// iOS Safari игнорирует user-scalable=no — гасим жесты масштабирования вручную
const preventZoom = (event: Event) => event.preventDefault();
document.addEventListener('gesturestart', preventZoom, { passive: false });
document.addEventListener('gesturechange', preventZoom, { passive: false });
document.addEventListener(
  'touchmove',
  (event) => {
    if (event.touches.length > 1) event.preventDefault();
  },
  { passive: false },
);
// Зум двойным тапом отключён через touch-action в base.css — без блокировки быстрых нажатий

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root not found');

// Офлайн-режим (service worker) и проверка новых версий — только в production-сборке
startUpdateChecks();
analytics.init();

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
