import { useSyncExternalStore } from 'react';
import { CURRENCIES, FALLBACK_EUR_RATES, type Currency } from '@/shared/config/currency';
import type { ISODate } from '@/shared/lib/date';

/**
 * Курсы валют на дату траты.
 * - Источник: Currency API (fawazahmed0) — бесплатно, без ключа, ежедневные курсы с марта 2024,
 *   есть RSD, RUB, USD. Запрашиваем файл конкретного дня (а не «latest», который CDN кеширует до недели).
 *   Если CDN jsDelivr недоступен — запасной адрес на Cloudflare Pages.
 * - Если за день файла нет (выходной, ещё не опубликован) — берём ближайший предыдущий день.
 * - Всё скачанное хранится на телефоне: каждый день запрашивается один раз, офлайн работает.
 * - Пока курс на нужную дату не загружен — используется ближайший известный, потом трата уточняется
 *   (см. app/useRatesBackfill.ts).
 * Таблица: 1 EUR = N единиц валюты.
 */
export type RateTable = Record<Currency, number>;

export interface RatesSnapshot {
  rates: RateTable;
  /** Дата курса; null — встроенная таблица. */
  date: ISODate | null;
  /** true — это курс именно на запрошенный день (или ближайший опубликованный перед ним). */
  exact: boolean;
}

export const RATES_SOURCE = { name: 'Currency API', url: 'https://github.com/fawazahmed0/exchange-api' };
/** С этой даты у источника есть ежедневные файлы. */
export const RATES_FIRST_DAY = '2024-03-02' as ISODate;

const KEY = 'relocate-spend:rates-v2';
const MAX_DAYS = 800;
const LOOKBACK = 6; // сколько дней назад искать опубликованный файл
const RETRY_TODAY_MS = 3 * 60 * 60 * 1000;

const urls = (day: string) => [
  `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${day}/v1/currencies/eur.min.json`,
  `https://${day}.currency-api.pages.dev/v1/currencies/eur.min.json`,
];

interface Stored {
  /** Курсы по дням публикации. */
  history: Record<string, RateTable>;
  /** Для запрошенного дня — какой день публикации ему соответствует. */
  resolved: Record<string, string>;
  /** Когда последний раз пытались уточнить «сегодня» (сегодняшний файл публикуется в течение дня). */
  todayTriedAt: number;
}

const listeners = new Set<() => void>();
let stored: Stored = read();
let version = 0;
let cache = new Map<string, RatesSnapshot>();

function read(): Stored {
  const empty: Stored = { history: {}, resolved: {}, todayTriedAt: 0 };
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null;
    if (!raw || typeof raw.history !== 'object') return empty;
    const history: Record<string, RateTable> = {};
    for (const [date, table] of Object.entries(raw.history)) {
      const clean = sanitizeTable(table);
      if (clean && /^\d{4}-\d{2}-\d{2}$/.test(date)) history[date] = clean;
    }
    const resolved: Record<string, string> = {};
    for (const [day, file] of Object.entries(raw.resolved ?? {})) if (history[file]) resolved[day] = file;
    return { history, resolved, todayTriedAt: Number(raw.todayTriedAt) || 0 };
  } catch {
    return empty;
  }
}

/** Таблица годится, только если есть все валюты приложения и курсы положительные. */
export function sanitizeTable(value: unknown): RateTable | null {
  if (!value || typeof value !== 'object') return null;
  const table = {} as RateTable;
  for (const c of CURRENCIES) {
    const rate = Number((value as Record<string, unknown>)[c]);
    if (!Number.isFinite(rate) || rate <= 0) return null;
    table[c] = rate;
  }
  table.EUR = 1;
  return table;
}

const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const shiftDay = (day: string, delta: number) => {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
};

/** Какой день нужен: будущее → сегодня, слишком давнее → первый день источника. */
function targetDay(date?: ISODate): string {
  const today = todayISO();
  if (!date || date > today) return today;
  return date < RATES_FIRST_DAY ? RATES_FIRST_DAY : date;
}

/**
 * Курсы на день траты — сразу, без сети.
 * Точный (уже загруженный) курс, иначе ближайший известный не позже этого дня, иначе самый ранний, иначе встроенный.
 */
export function getRatesFor(date?: ISODate): RatesSnapshot {
  const day = targetDay(date);
  const hit = cache.get(day);
  if (hit) return hit;
  let snapshot: RatesSnapshot;
  const file = stored.resolved[day];
  if (file && stored.history[file]) {
    snapshot = { rates: stored.history[file], date: file as ISODate, exact: true };
  } else {
    const known = Object.keys(stored.history).sort();
    let pick: string | undefined;
    for (const d of known) if (d <= day) pick = d;
    pick ??= known[0];
    snapshot = pick
      ? { rates: stored.history[pick]!, date: pick as ISODate, exact: false }
      : { rates: { ...FALLBACK_EUR_RATES }, date: null, exact: false };
  }
  cache.set(day, snapshot);
  return snapshot;
}

/** Перевод суммы между любыми двумя валютами по таблице. */
export function convertWith(amount: number, from: Currency, to: Currency, rates: RateTable): number {
  if (from === to) return amount;
  const fromRate = rates[from];
  return fromRate > 0 ? (amount / fromRate) * rates[to] : 0;
}

function commit(mutate: (s: Stored) => void) {
  const next: Stored = { history: { ...stored.history }, resolved: { ...stored.resolved }, todayTriedAt: stored.todayTriedAt };
  mutate(next);
  const days = Object.keys(next.history).sort();
  for (const old of days.slice(0, Math.max(0, days.length - MAX_DAYS))) delete next.history[old];
  stored = next;
  cache = new Map();
  version++;
  try {
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    /* хранилище недоступно — курсы живут до перезапуска */
  }
  listeners.forEach((l) => l());
}

type DayResult = { table: RateTable; date: string } | 'missing' | 'offline';

/** Файл курсов за один день. missing — файла за этот день нет (404), offline — сеть недоступна. */
async function fetchDay(day: string): Promise<DayResult> {
  let missing = false;
  for (const url of urls(day)) {
    try {
      const response = await fetch(url);
      if (response.status === 404) {
        missing = true;
        continue;
      }
      if (!response.ok) continue;
      const json = (await response.json()) as { date?: string; eur?: Record<string, unknown> };
      const eur = json.eur ?? {};
      const table = sanitizeTable({ EUR: 1, RSD: eur.rsd, USD: eur.usd, RUB: eur.rub });
      if (table) return { table, date: typeof json.date === 'string' ? json.date : day };
    } catch {
      /* пробуем запасной адрес */
    }
  }
  return missing ? 'missing' : 'offline';
}

const pending = new Map<string, Promise<RatesSnapshot>>();

/**
 * Загрузить курс на день траты (если ещё не загружен). Возвращает итоговые курсы.
 * Без сети — возвращает то, что есть, и не помечает день как загруженный (попробуем позже).
 */
export function ensureRatesFor(date?: ISODate): Promise<RatesSnapshot> {
  const day = targetDay(date);
  const isToday = day === todayISO();
  const known = stored.resolved[day];
  const fresh = known && (!isToday || known === day || Date.now() - stored.todayTriedAt < RETRY_TODAY_MS);
  if (fresh || (typeof navigator !== 'undefined' && navigator.onLine === false)) return Promise.resolve(getRatesFor(date));
  const running = pending.get(day);
  if (running) return running;

  const task = (async () => {
    for (let back = 0; back < LOOKBACK; back++) {
      const candidate = shiftDay(day, -back);
      if (candidate < RATES_FIRST_DAY) break;
      if (stored.history[candidate]) {
        commit((s) => {
          s.resolved[day] = candidate;
          if (isToday) s.todayTriedAt = Date.now();
        });
        break;
      }
      const result = await fetchDay(candidate);
      if (result === 'offline') break;
      if (result === 'missing') continue;
      commit((s) => {
        s.history[result.date] = result.table;
        s.resolved[day] = result.date;
        if (isToday) s.todayTriedAt = Date.now();
      });
      break;
    }
    return getRatesFor(date);
  })().finally(() => pending.delete(day));
  pending.set(day, task);
  return task;
}

/** Свежие курсы (на сегодня). */
export const refreshRates = () => ensureRatesFor().then(() => undefined);

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Перерисовать компонент, когда пришли новые курсы. Возвращает курсы на сегодня. */
export function useLatestRates(): RatesSnapshot {
  useSyncExternalStore(subscribe, () => version, () => version);
  return getRatesFor();
}

/** Номер версии курсов — для зависимостей эффектов. */
export function useRatesVersion(): number {
  return useSyncExternalStore(subscribe, () => version, () => version);
}
