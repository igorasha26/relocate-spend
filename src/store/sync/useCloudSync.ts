import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { ApiError, auth, restRequest, rpc, useSession } from '@/shared/api';
import { analytics } from '@/shared/analytics';
import { HAS_BACKEND } from '@/shared/config/env';
import { createDefaultState, reducer } from '../reducer';
import type { Action, AppState, PersistedState } from '../types';
import { diffForPush, docKey, isEmptyPatch, remoteToPatch, type RemoteRow } from './docs';

export type SyncStatus = 'off' | 'syncing' | 'synced' | 'offline' | 'error';

export interface SyncApi {
  status: SyncStatus;
  lastSyncedAt: number | null;
  /** Есть изменения, которые ещё не попали в облако. */
  hasPending: () => boolean;
  syncNow: () => Promise<void>;
  /** Выйти: последние изменения отправляются, данные аккаунта убираются с устройства. */
  signOut: () => Promise<void>;
  /** Удалить аккаунт и все данные в облаке. */
  deleteAccount: () => Promise<void>;
}

interface SyncMeta {
  userId: string;
  /** updated_at самой свежей полученной записи. */
  cursor: string | null;
  /** Отпечатки записей в том виде, в каком они лежат в облаке. */
  hashes: Record<string, string>;
}

const META_KEY = 'relocate-spend:sync';
const PAGE = 1000;
const PUSH_CHUNK = 200;
const DEBOUNCE_MS = 1500;
const POLL_MS = 2 * 60 * 1000;

function readMeta(userId: string): SyncMeta {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) ?? 'null') as SyncMeta | null;
    if (m && m.userId === userId && typeof m.hashes === 'object') return m;
  } catch {
    /* нет меты — первая синхронизация */
  }
  // Новый аккаунт на этом устройстве: всё локальное будет добавлено в аккаунт
  return { userId, cursor: null, hashes: {} };
}

const writeMeta = (meta: SyncMeta | null) => {
  try {
    if (meta) localStorage.setItem(META_KEY, JSON.stringify(meta));
    else localStorage.removeItem(META_KEY);
  } catch {
    /* не критично: в худшем случае данные отправятся ещё раз */
  }
};

const persisted = ({ version, expenses, categories, settings, scans }: AppState): PersistedState => ({
  version,
  expenses,
  categories,
  settings,
  scans,
});

/**
 * Синхронизация с Supabase. Приложение по-прежнему работает с localStorage (быстро и без сети),
 * а этот хук в фоне: забирает изменения из облака → применяет → отправляет локальные изменения.
 */
export function useCloudSync(state: AppState, dispatch: Dispatch<Action>): SyncApi {
  const session = useSession();
  const userId = HAS_BACKEND ? (session?.user.id ?? null) : null;
  const [status, setStatus] = useState<SyncStatus>('off');
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;
  const running = useRef<Promise<void> | null>(null);
  const again = useRef(false);

  const runOnce = useCallback(async (uid: string) => {
    if (stateRef.current.status !== 'ready') return;
    if (navigator.onLine === false) {
      setStatus('offline');
      return;
    }
    setStatus('syncing');
    const meta = readMeta(uid);
    try {
      // 1. Забираем изменения из облака (с запасом 5 с — на случай одновременных записей)
      const rows: RemoteRow[] = [];
      const since = meta.cursor ? new Date(Date.parse(meta.cursor) - 5000).toISOString() : null;
      for (let offset = 0; ; offset += PAGE) {
        const filter = since ? `&updated_at=gte.${encodeURIComponent(since)}` : '';
        const page = await restRequest<RemoteRow[]>(
          `records?select=kind,id,data,deleted,updated_at${filter}&order=updated_at.asc,kind.asc,id.asc&limit=${PAGE}&offset=${offset}`,
        );
        rows.push(...page);
        if (page.length < PAGE) break;
      }

      let current = persisted(stateRef.current);
      if (rows.length) {
        const patch = remoteToPatch(rows, current, meta.hashes);
        meta.cursor = rows.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), meta.cursor ?? '');
        if (!isEmptyPatch(patch)) {
          const action: Action = { type: 'sync/apply', payload: patch };
          // reducer чистый — считаем итог сразу, не дожидаясь перерисовки
          current = persisted(reducer({ ...current, status: 'ready' }, action));
          dispatch(action);
        }
        writeMeta(meta);
      }

      // 2. Отправляем то, чего в облаке ещё нет
      const { changed, removed } = diffForPush(current, meta.hashes);
      const upserts = [
        ...changed.map((d) => ({ user_id: uid, kind: d.kind, id: d.id, data: d.data, deleted: false, _key: docKey(d.kind, d.id), _hash: d.hash })),
        ...removed.map((d) => ({ user_id: uid, kind: d.kind, id: d.id, data: null, deleted: true, _key: d.key, _hash: null })),
      ];
      for (let i = 0; i < upserts.length; i += PUSH_CHUNK) {
        const chunk = upserts.slice(i, i + PUSH_CHUNK);
        await restRequest('records?on_conflict=user_id,kind,id', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: chunk.map(({ _key: _k, _hash: _h, ...row }) => row),
        });
        for (const row of chunk) {
          if (row._hash === null) delete meta.hashes[row._key];
          else meta.hashes[row._key] = row._hash;
        }
        writeMeta(meta);
      }

      setLastSyncedAt(Date.now());
      setStatus('synced');
    } catch (error) {
      writeMeta(meta);
      if (error instanceof ApiError && error.isNetwork) setStatus('offline');
      else {
        console.warn('[sync] failed', error);
        setStatus(auth.getSession() ? 'error' : 'off');
      }
    }
  }, [dispatch]);

  const sync = useCallback(async () => {
    if (!userId) return;
    if (running.current) {
      again.current = true; // во время синхронизации что-то изменилось — повторим после
      return running.current;
    }
    running.current = (async () => {
      do {
        again.current = false;
        await runOnce(userId);
      } while (again.current);
    })().finally(() => {
      running.current = null;
    });
    return running.current;
  }, [userId, runOnce]);

  // Вход/выход
  useEffect(() => {
    if (!userId) {
      setStatus('off');
      return;
    }
    analytics.identify(userId);
    void sync();
  }, [userId, sync]);

  // Локальные изменения — с небольшой задержкой, чтобы серия правок ушла одним запросом
  const { status: loadStatus, expenses, categories, settings, scans } = state;
  useEffect(() => {
    if (!userId || loadStatus !== 'ready') return;
    const timer = setTimeout(() => void sync(), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [userId, loadStatus, expenses, categories, settings, scans, sync]);

  // Появилась сеть, вернулись в приложение, периодически — изменения с других устройств
  useEffect(() => {
    if (!userId) return;
    const onVisible = () => document.visibilityState === 'visible' && void sync();
    const onOnline = () => void sync();
    const onOffline = () => setStatus('offline');
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    const poll = setInterval(() => document.visibilityState === 'visible' && void sync(), POLL_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(poll);
    };
  }, [userId, sync]);

  const clearDevice = useCallback(() => {
    writeMeta(null);
    analytics.reset();
    // Настройки устройства (язык, тема, валюта) оставляем — меняется только содержимое
    const fresh = createDefaultState();
    dispatch({ type: 'sync/reset', payload: { ...fresh, settings: { ...stateRef.current.settings, createdAt: fresh.settings.createdAt } } });
  }, [dispatch]);

  const hasPending = useCallback(() => {
    if (!userId) return false;
    const { changed, removed } = diffForPush(persisted(stateRef.current), readMeta(userId).hashes);
    return changed.length + removed.length > 0;
  }, [userId]);

  const signOut = useCallback(async () => {
    if (navigator.onLine !== false) await sync().catch(() => {});
    analytics.track('logout');
    await auth.signOut();
    clearDevice();
  }, [sync, clearDevice]);

  const deleteAccount = useCallback(async () => {
    await rpc('delete_my_account');
    analytics.track('account_deleted');
    auth.dropSession();
    clearDevice();
  }, [clearDevice]);

  return useMemo(
    () => ({ status, lastSyncedAt, hasPending, syncNow: sync, signOut, deleteAccount }),
    [status, lastSyncedAt, hasPending, sync, signOut, deleteAccount],
  );
}
