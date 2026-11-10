/*
 * Service worker: приложение работает без интернета и без запущенного ноутбука.
 * После первого открытия файлы сохраняются на телефоне.
 *  - Страница: сначала сеть (чтобы получать обновления), без сети — из кеша.
 *  - Скрипты/стили/иконки: из кеша (у сборки Vite имена с хешем, они не меняются).
 * Данные расходов хранятся в localStorage и сюда не относятся.
 */
// Оба значения подставляет scripts/postbuild.mjs после сборки:
// версия кеша меняется с каждой сборкой, список — все файлы приложения (включая экраны, грузящиеся по требованию).
const CACHE = 'relocate-spend-__BUILD__';
const PRECACHE = ['./', './index.html' /* __PRECACHE__ */];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  // Переходы по страницам приложения (SPA): сеть → кеш index.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html')),
    );
    return;
  }

  // Ресурсы: кеш → сеть (с сохранением в кеш)
  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
