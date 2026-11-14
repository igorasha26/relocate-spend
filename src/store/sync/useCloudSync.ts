import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch } from 'react';
import { ApiError, auth, restRequest, rpc, useSession } from '@/shared/api';
import { analytics } from '@/shared/analytics';
import { HAS_BACKEND } from '@/shared/config/env';
import { createDefaultState, reducer } from '../reducer';
import type { Action, AppState, PersistedState } from '../types';
import { groupsStore } from '../groups';
import { diffForPush, docKey, isEmptyPatch, PERSONAL, remoteToPatch, type RemoteRow, type Space } from './docs';

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
  /** Обновить список групп и синхронизировать (после создания группы, вступления). */
  refreshGroups: () => Promise<void>;
  /** Выйти из группы; true — группа удалена (был последним). */
  leaveGroup: (groupId: string, takeExpenses: boolean) => Promise<boolean>;
}

interface SpaceMeta {
  /** updated_at самой свежей полученной записи. */
  cursor: string | null;
  /** Отпечатки записей в том виде, в каком они лежат в облаке. */
  hashes: Record<string, string>;
}

interface SyncMeta extends SpaceMeta {
  userId: string;
  /** То же для каждой группы трат. */
  groups: Record<string, SpaceMeta>;
}

const META_KEY = 'relocate-spend:sync';
const PAGE = 1000;
const PUSH_CHUNK = 200;
const DEBOUNCE_MS = 1500;
const POLL_MS = 2 * 60 * 1000;
/** С группами опрашиваем чаще: траты второго человека должны появляться быстро. */
const POLL_GROUPS_MS = 30 * 1000;
const GROUPS_REFRESH_MS = 60 * 1000;

function readMeta(userId: string): SyncMeta {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) ?? 'null') as SyncMeta | null;
    if (m && m.userId === userId && typeof m.hashes === 'object') return { ...m, groups: m.groups ?? {} };
  } catch {
    /* нет меты — первая синхронизация */
  }
  // Новый аккаунт на этом устройстве: всё локальное будет добавлено в аккаунт
  return { userId, cursor: null, hashes: {}, groups: {} };
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
  const lastGroupsRefresh = useRef(0);
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
      let current = persisted(stateRef.current);

      /** Один цикл для пространства: забрать изменения → применить → отправить своё. */
      const syncSpace = async (space: Space, spaceMeta: SpaceMeta) => {
        const table = space.type === 'group' ? 'group_records' : 'records';
        const scope = space.type === 'group' ? `&group_id=eq.${space.id}` : '';

        // 1. Забираем изменения из облака (с запасом 5 с — на случай одновременных записей)
        const rows: RemoteRow[] = [];
        const since = spaceMeta.cursor ? new Date(Date.parse(spaceMeta.cursor) - 5000).toISOString() : null;
        for (let offset = 0; ; offset += PAGE) {
          const filter = since ? `&updated_at=gte.${encodeURIComponent(since)}` : '';
          const page = await restRequest<RemoteRow[]>(
            `${table}?select=kind,id,data,deleted,updated_at${scope}${filter}&order=updated_at.asc,kind.asc,id.asc&limit=${PAGE}&offset=${offset}`,
          );
          rows.push(...page);
          if (page.length < PAGE) break;
        }
        if (rows.length) {
          const patch = remoteToPatch(rows, current, spaceMeta.hashes, space);
          spaceMeta.cursor = rows.reduce((max, r) => (r.updated_at > max ? r.updated_at : max), spaceMeta.cursor ?? '');
          if (!isEmptyPatch(patch)) {
            const action: Action = { type: 'sync/apply', payload: patch };
            // reducer чистый — считаем итог сразу, не дожидаясь перерисовки
            current = persisted(reducer({ ...current, status: 'ready' }, action));
            dispatch(action);
          }
          writeMeta(meta);
        }

        // 2. Отправляем то, чего в облаке ещё нет
        const { changed, removed } = diffForPush(current, spaceMeta.hashes, space);
        const owner = space.type === 'group' ? { group_id: space.id } : { user_id: uid };
        const upserts = [
          ...changed.map((d) => ({ ...owner, kind: d.kind, id: d.id, data: d.data, deleted: false, _key: docKey(d.kind, d.id), _hash: d.hash })),
          ...removed.map((d) => ({ ...owner, kind: d.kind, id: d.id, data: null, deleted: true, _key: d.key, _hash: null })),
        ];
        const conflict = space.type === 'group' ? 'group_id,kind,id' : 'user_id,kind,id';
        for (let i = 0; i < upserts.length; i += PUSH_CHUNK) {
          const chunk = upserts.slice(i, i + PUSH_CHUNK);
          await restRequest(`${table}?on_conflict=${conflict}`, {
            method: 'POST',
            headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
            body: chunk.map(({ _key: _k, _hash: _h, ...row }) => row),
          });
          for (const row of chunk) {
            if (row._hash === null) delete spaceMeta.hashes[row._key];
            else spaceMeta.hashes[row._key] = row._hash;
          }
          writeMeta(meta);
        }
      };

      // Личные данные
      await syncSpace(PERSONAL, meta);

      // Группы трат: список групп обновляем не чаще раза в минуту (и сразу после действий с группами)
      if (Date.now() - lastGroupsRefresh.current > GROUPS_REFRESH_MS) {
        lastGroupsRefresh.current = Date.now();
        await groupsStore.refresh().catch(() => {});
      }
      const { groups, fresh, userId: groupsUser } = groupsStore.get();
      if (groupsUser === uid) {
        const ids = groups.map((g) => g.id);
        if (fresh) {
          // Вышли из группы / группа удалена — её траты убираем с устройства
          const action: Action = { type: 'expense/dropGroups', payload: { keepGroupIds: ids } };
          const next = persisted(reducer({ ...current, status: 'ready' }, action));
          if (next.expenses.length !== current.expenses.length) {
            current = next;
            dispatch(action);
          }
          for (const gid of Object.keys(meta.groups)) if (!ids.includes(gid)) delete meta.groups[gid];
        }
        for (const gid of ids) {
          meta.groups[gid] ??= { cursor: null, hashes: {} };
          await syncSpace({ type: 'group', id: gid }, meta.groups[gid]);
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
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      // вернулись в приложение (например, после письма о приглашении) — сразу проверяем группы и приглашения
      lastGroupsRefresh.current = 0;
      void sync();
    };
    const onOnline = () => void sync();
    const onOffline = () => setStatus('offline');
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    let lastPoll = Date.now();
    const poll = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      const interval = groupsStore.groups().length ? POLL_GROUPS_MS : POLL_MS;
      if (Date.now() - lastPoll < interval) return;
      lastPoll = Date.now();
      void sync();
    }, POLL_GROUPS_MS);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      clearInterval(poll);
    };
  }, [userId, sync]);

  const clearDevice = useCallback(() => {
    writeMeta(null);
    groupsStore.clear();
    analytics.reset();
    // Настройки устройства (язык, тема, валюта) оставляем — меняется только содержимое
    const fresh = createDefaultState();
    dispatch({ type: 'sync/reset', payload: { ...fresh, settings: { ...stateRef.current.settings, createdAt: fresh.settings.createdAt } } });
  }, [dispatch]);

  const hasPending = useCallback(() => {
    if (!userId) return false;
    const state = persisted(stateRef.current);
    const meta = readMeta(userId);
    const spaces: [Space, Record<string, string>][] = [
      [PERSONAL, meta.hashes],
      ...groupsStore.groups().map((g): [Space, Record<string, string>] => [{ type: 'group', id: g.id }, meta.groups[g.id]?.hashes ?? {}]),
    ];
    return spaces.some(([space, hashes]) => {
      const { changed, removed } = diffForPush(state, hashes, space);
      return changed.length + removed.length > 0;
    });
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

  /** После действий с группами (создал, вступил) — сразу обновить список и синхронизировать. */
  const refreshGroups = useCallback(async () => {
    lastGroupsRefresh.current = 0;
    await sync();
  }, [sync]);

  /**
   * Выйти из группы. takeExpenses — сначала забрать траты группы в личные
   * (предлагается последнему участнику: после его выхода группа удаляется вместе с тратами).
   */
  const leaveGroup = useCallback(
    async (groupId: string, takeExpenses: boolean) => {
      if (takeExpenses) {
        const ids = stateRef.current.expenses.filter((e) => e.groupId === groupId).map((e) => e.id);
        dispatch({ type: 'expense/move', payload: { ids, groupId: null, me: groupsStore.me() } });
        // дождаться, пока перенос попадёт в состояние, которое читает синхронизация
        for (let i = 0; i < 50 && stateRef.current.expenses.some((e) => e.groupId === groupId); i++) {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
        await sync();
      }
      const deleted = await groupsStore.leaveGroup(groupId);
      analytics.track('group_left', { deleted, took_expenses: takeExpenses });
      await refreshGroups();
      return deleted;
    },
    [dispatch, sync, refreshGroups],
  );

  return useMemo(
    () => ({ status, lastSyncedAt, hasPending, syncNow: sync, signOut, deleteAccount, refreshGroups, leaveGroup }),
    [status, lastSyncedAt, hasPending, sync, signOut, deleteAccount, refreshGroups, leaveGroup],
  );
}
