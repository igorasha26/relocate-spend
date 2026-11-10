import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
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

// Офлайн-режим: только в production-сборке (в dev service worker мешал бы горячей перезагрузке)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((error: unknown) => {
      console.warn('[sw] registration failed', error);
    });
  });
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
