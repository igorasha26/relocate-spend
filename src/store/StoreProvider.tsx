import { useCallback, useEffect, useMemo, useReducer, useRef, type ReactNode } from 'react';
import { createActions } from './actions';
import { ActionsContext, StateContext, SyncContext } from './context';
import { initialState, reducer } from './reducer';
import { localStorageRepository, type StateRepository } from './storage';
import { useCloudSync } from './sync/useCloudSync';
import type { PersistedState } from './types';

interface Props {
  children: ReactNode;
  repository?: StateRepository;
}

export function StoreProvider({ children, repository = localStorageRepository }: Props) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const loaded = useRef(false);

  const load = useCallback(() => {
    dispatch({ type: 'load/start' });
    repository
      .load()
      .then((data) => {
        loaded.current = true;
        dispatch({ type: 'load/success', payload: data });
      })
      .catch((error: unknown) => {
        console.error('[store] load failed', error);
        dispatch({ type: 'load/failure' });
      });
  }, [repository]);

  useEffect(load, [load]);

  // Сохраняем только после успешной загрузки — иначе можно затереть данные пустым состоянием.
  const { status, version, expenses, categories, settings, scans } = state;
  useEffect(() => {
    if (status !== 'ready' || !loaded.current) return;
    const snapshot: PersistedState = { version, expenses, categories, settings, scans };
    repository.save(snapshot).catch((error: unknown) => console.error('[store] save failed', error));
  }, [repository, status, version, expenses, categories, settings, scans]);

  const actions = useMemo(() => ({ ...createActions(dispatch), reload: load }), [load]);
  const sync = useCloudSync(state, dispatch);

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>
        <SyncContext.Provider value={sync}>{children}</SyncContext.Provider>
      </ActionsContext.Provider>
    </StateContext.Provider>
  );
}
