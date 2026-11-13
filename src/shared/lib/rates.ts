import { useSyncExternalStore } from 'react';
import { CURRENCIES, FALLBACK_EUR_RATES, type Currency } from '@/shared/config/currency';
import type { ISODate } from '@/shared/lib/date';

/**
 * Курсы валют.
 * - Источник: ExchangeRate-API (open.er-api.com) — бесплатно, без ключа, обновляется раз в сутки,
 *   есть RSD, RUB, USD. Условие бесплатного доступа — ссылка на источник (она есть в профиле).
 * - Запрашиваются не чаще раза в 6 часов, хранятся на телефоне (работает офлайн).
 * - Копится история по дням: трата задним числом берёт курс на свою дату (если он есть).
 * - Нет сети и истории — встроенная таблица FALLBACK_EUR_RATES.
 * Таблица: 1 EUR = N единиц валюты.
 */
export type RateTable = Record<Currency, number>;

export interface RatesSnapshot {
  rates: RateTable;
  /** Дата курса; null — встроенная таблица. */
  date: ISODate | null;
}

const API_URL = 'https://open.er-api.com/v6/latest/EUR';
export const RATES_SOURCE = { name: 'ExchangeRate-API', url: 'https://www.exchangerate-api.com' };
const KEY = 'relocate-spend:rates';
const REFRESH_MS = 6 * 60 * 60 * 1000;
const MAX_DAYS = 500;

interface Stored {
  fetchedAt: number;
  /** Курсы по датам публикации. */
  history: Record<ISODate, RateTable>;
}

const listeners = new Set<() => void>();
let stored: Stored = read();
let version = 0;
let cache = new Map<string, RatesSnapshot>();

function read(): Stored {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Stored | null;
    if (raw && typeof raw.history === 'object') {
      const history: Record<ISODate, RateTable> = {};
      for (const [date, table] of Object.entries(raw.history)) {
        const clean = sanitizeTable(table);
        if (clean && /^\d{4}-\d{2}-\d{2}$/.test(date)) history[date as ISODate] = clean;
      }
      return { fetchedAt: Number(raw.fetchedAt) || 0, history };
    }
  } catch {
    /* нет сохранённых курсов */
  }
  return { fetchedAt: 0, history: {} };
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

const dates = () => Object.keys(stored.history).sort() as ISODate[];

/**
 * Курсы на дату покупки: последний известный курс не позже этой даты.
 * Дата раньше всей истории — самый ранний известный; без даты — самый свежий.
 */
export function getRatesFor(date?: ISODate): RatesSnapshot {
  const key = date ?? 'latest';
  const hit = cache.get(key);
  if (hit) return hit;
  const known = dates();
  let pick: ISODate | undefined;
  if (known.length) {
    if (!date) pick = known[known.length - 1];
    else {
      pick = known[0];
      for (const d of known) if (d <= date) pick = d;
    }
  }
  const snapshot: RatesSnapshot = pick
    ? { rates: stored.history[pick]!, date: pick }
    : { rates: { ...FALLBACK_EUR_RATES }, date: null };
  cache.set(key, snapshot);
  return snapshot;
}

/** Перевод суммы между любыми двумя валютами по таблице. */
export function convertWith(amount: number, from: Currency, to: Currency, rates: RateTable): number {
  if (from === to) return amount;
  const fromRate = rates[from];
  return fromRate > 0 ? (amount / fromRate) * rates[to] : 0;
}

function save(next: Stored) {
  const known = Object.keys(next.history).sort();
  for (const old of known.slice(0, Math.max(0, known.length - MAX_DAYS))) delete next.history[old as ISODate];
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

let inFlight: Promise<void> | null = null;

/** Обновить курсы, если прошло больше 6 часов (или force). Ошибки сети — молча, работаем на старых. */
export function refreshRates(force = false): Promise<void> {
  if (!force && Date.now() - stored.fetchedAt < REFRESH_MS) return Promise.resolve();
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return Promise.resolve();
  inFlight ??= (async () => {
    try {
      const response = await fetch(API_URL, { cache: 'no-store' });
      if (!response.ok) return;
      const json = (await response.json()) as { result?: string; time_last_update_unix?: number; rates?: unknown };
      const table = json.result === 'success' ? sanitizeTable(json.rates) : null;
      if (!table) return;
      const published = json.time_last_update_unix ? new Date(json.time_last_update_unix * 1000) : new Date();
      const date = published.toISOString().slice(0, 10) as ISODate;
      save({ fetchedAt: Date.now(), history: { ...stored.history, [date]: table } });
    } catch {
      /* офлайн или сервис недоступен */
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Перерисовать компонент, когда пришли новые курсы. Возвращает самые свежие. */
export function useLatestRates(): RatesSnapshot {
  useSyncExternalStore(subscribe, () => version, () => version);
  return getRatesFor();
}
