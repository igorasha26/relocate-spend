import { ENV } from '@/shared/config/env';

/**
 * Продуктовая аналитика: PostHog через его HTTP API, без внешней библиотеки (≈3 КБ вместо ≈60 КБ).
 * - Отправляются только события («добавил трату», «прошёл обучение»), без сумм, названий и почты.
 * - Идентификатор — случайный, хранится в localStorage; после входа события связываются с id аккаунта.
 * - Без сети события копятся и уходят позже. Пользователь может выключить статистику в профиле.
 */
type Props = Record<string, string | number | boolean | null | undefined>;

interface QueuedEvent {
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
}

const KEYS = {
  anonId: 'relocate-spend:aid',
  userId: 'relocate-spend:uid',
  session: 'relocate-spend:asession',
  queue: 'relocate-spend:aqueue',
  optOut: 'relocate-spend:analytics-off',
};
const SESSION_IDLE_MS = 30 * 60 * 1000;
const MAX_QUEUE = 300;

const storage = {
  get(key: string) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string | null) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {
      /* без хранилища — просто не запоминаем */
    }
  },
};

/** UUID v7 (время + случайность) — такой формат PostHog ждёт для идентификаторов сессий. */
function uuidv7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const ts = Date.now();
  for (let i = 0; i < 6; i++) bytes[i] = Math.floor(ts / 2 ** (8 * (5 - i))) & 0xff;
  bytes[6] = (bytes[6]! & 0x0f) | 0x70;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function anonId(): string {
  let id = storage.get(KEYS.anonId);
  if (!id) {
    id = uuidv7();
    storage.set(KEYS.anonId, id);
  }
  return id;
}

const distinctId = () => storage.get(KEYS.userId) ?? anonId();

/** Сессия = непрерывное использование; после 30 минут тишины начинается новая. */
function sessionId(): string {
  const now = Date.now();
  let session: { id: string; last: number } | null = null;
  try {
    session = JSON.parse(storage.get(KEYS.session) ?? 'null');
  } catch {
    session = null;
  }
  if (!session || now - session.last > SESSION_IDLE_MS) session = { id: uuidv7(), last: now };
  session.last = now;
  storage.set(KEYS.session, JSON.stringify(session));
  return session.id;
}

function deviceProps(): Record<string, unknown> {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Mac OS X/.test(ua)
        ? 'Mac OS X'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Linux/.test(ua)
            ? 'Linux'
            : 'Other';
  const browser = /EdgA?\//.test(ua)
    ? 'Edge'
    : /YaBrowser/.test(ua)
      ? 'Yandex'
      : /SamsungBrowser/.test(ua)
        ? 'Samsung Internet'
        : /Firefox|FxiOS/.test(ua)
          ? 'Firefox'
          : /Chrome|CriOS/.test(ua)
            ? 'Chrome'
            : /Safari/.test(ua)
              ? 'Safari'
              : 'Other';
  const standalone =
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return {
    $os: os,
    $browser: browser,
    $device_type: /Mobi|iPhone|Android/.test(ua) ? 'Mobile' : /iPad|Tablet/.test(ua) ? 'Tablet' : 'Desktop',
    $screen_width: window.screen?.width,
    $screen_height: window.screen?.height,
    $viewport_width: window.innerWidth,
    $raw_user_agent: ua,
    standalone,
  };
}

let queue: QueuedEvent[] = [];
try {
  queue = JSON.parse(storage.get(KEYS.queue) ?? '[]');
} catch {
  queue = [];
}
let timer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let initialReferrer: string | null = null;

const enabled = () => Boolean(ENV.posthog.key) && storage.get(KEYS.optOut) !== '1';
const persistQueue = () => storage.set(KEYS.queue, queue.length ? JSON.stringify(queue) : null);

function enqueue(event: string, properties: Record<string, unknown>) {
  if (!enabled()) return;
  initialReferrer ??= document.referrer || '$direct';
  queue.push({
    event,
    timestamp: new Date().toISOString(),
    properties: {
      distinct_id: distinctId(),
      $session_id: sessionId(),
      $current_url: location.href,
      $pathname: location.pathname,
      $host: location.host,
      $referrer: initialReferrer,
      $lib: 'relocate-spend-web',
      $lib_version: ENV.version,
      app_version: ENV.version,
      app_env: ENV.appEnv,
      language: document.documentElement.lang || undefined,
      ...deviceProps(),
      ...properties,
    },
  });
  if (queue.length > MAX_QUEUE) queue = queue.slice(-MAX_QUEUE);
  persistQueue();
  schedule(queue.length >= 20 ? 0 : 3000);
}

function schedule(delay: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void flush(), delay);
}

async function flush(keepalive = false) {
  if (flushing || queue.length === 0 || !ENV.posthog.key) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  flushing = true;
  const batch = queue.slice(0, 50);
  try {
    const response = await fetch(`${ENV.posthog.host}/batch/`, {
      method: 'POST',
      keepalive,
      // text/plain — без предварительного CORS-запроса; PostHog всё равно разбирает JSON
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ api_key: ENV.posthog.key, batch }),
    });
    if (response.ok || (response.status >= 400 && response.status < 500)) {
      queue = queue.slice(batch.length); // 4xx повторять бессмысленно
      persistQueue();
    }
  } catch {
    /* офлайн — отправим позже */
  } finally {
    flushing = false;
    if (queue.length) schedule(keepalive ? 0 : 15_000);
  }
}

let started = false;

export const analytics = {
  /** Подписки на сворачивание приложения и появление сети. Вызывается один раз при старте. */
  init() {
    if (started) return;
    started = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') void flush(true);
    });
    window.addEventListener('pagehide', () => void flush(true));
    window.addEventListener('online', () => schedule(500));
    if (queue.length) schedule(2000);
  },

  track(event: string, props: Props = {}) {
    enqueue(event, props);
  },

  /** Переход по экранам — для отчётов о посещаемости. */
  page(name: string) {
    enqueue('$pageview', { screen: name });
  },

  /** Свойства человека в PostHog (число трат, валюта…) — по ним строятся когорты. */
  setPersonProps(props: Props) {
    enqueue('$set', { $set: props });
  },

  /** После входа: события с этого устройства привязываются к аккаунту (и до входа — тоже). */
  identify(userId: string) {
    if (storage.get(KEYS.userId) === userId) return;
    const anon = anonId();
    storage.set(KEYS.userId, userId);
    enqueue('$identify', { distinct_id: userId, $anon_distinct_id: anon });
  },

  /** После выхода: новое анонимное лицо, чтобы не смешивать людей на одном телефоне. */
  reset() {
    storage.set(KEYS.userId, null);
    storage.set(KEYS.anonId, null);
    storage.set(KEYS.session, null);
  },

  isOptedOut: () => storage.get(KEYS.optOut) === '1',

  setOptOut(off: boolean) {
    if (off) {
      enqueue('analytics_opted_out', {});
      void flush(true).then(() => {
        storage.set(KEYS.optOut, '1');
        queue = [];
        persistQueue();
      });
      storage.set(KEYS.optOut, '1');
    } else {
      storage.set(KEYS.optOut, null);
    }
  },

  isConfigured: () => Boolean(ENV.posthog.key),
};
