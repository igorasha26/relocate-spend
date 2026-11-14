import { useCallback, useSyncExternalStore } from 'react';
import type { Expense } from '@/entities/expense';
import { useGroups, type Group } from './groups';

/**
 * Что показывает главная: все траты, только личные или одна группа.
 * Это же место по умолчанию для новых трат: выбрана группа — трата уходит в неё, иначе — в личные.
 */
export type SpaceId = 'all' | 'personal' | `g:${string}`;

const KEY = 'relocate-spend:space';
const listeners = new Set<() => void>();
let current: SpaceId = read();

function read(): SpaceId {
  try {
    const v = localStorage.getItem(KEY);
    if (v === 'all' || v === 'personal' || v?.startsWith('g:')) return v as SpaceId;
  } catch {
    /* по умолчанию — всё */
  }
  return 'all';
}

export const spaceStore = {
  get: () => current,
  set(next: SpaceId) {
    current = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* не критично */
    }
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};

export const groupSpace = (groupId: string): SpaceId => `g:${groupId}`;
export const spaceGroupId = (space: SpaceId): string | null => (space.startsWith('g:') ? space.slice(2) : null);

export function filterBySpace<T extends Pick<Expense, 'groupId'>>(expenses: T[], space: SpaceId): T[] {
  if (space === 'all') return expenses;
  if (space === 'personal') return expenses.filter((e) => !e.groupId);
  const id = spaceGroupId(space);
  return expenses.filter((e) => e.groupId === id);
}

export interface SpaceInfo {
  space: SpaceId;
  setSpace: (space: SpaceId) => void;
  groups: Group[];
  /** Выбранная группа, если выбрана группа. */
  group: Group | null;
  /** Куда по умолчанию попадёт новая трата: id группы или null (личные). */
  targetGroupId: string | null;
}

/** Выбранный раздел. Группа, из которой вышли (или чужой аккаунт), превращается во «Все». */
export function useSpace(): SpaceInfo {
  const stored = useSyncExternalStore(spaceStore.subscribe, spaceStore.get, spaceStore.get);
  const { groups } = useGroups();
  const id = spaceGroupId(stored);
  const group = id ? (groups.find((g) => g.id === id) ?? null) : null;
  // без групп переключать нечего: показываем всё, новые траты — в личные
  const space: SpaceId = groups.length === 0 ? 'all' : id && !group ? 'all' : stored;
  const setSpace = useCallback((next: SpaceId) => spaceStore.set(next), []);
  return { space, setSpace, groups, group, targetGroupId: group?.id ?? null };
}
