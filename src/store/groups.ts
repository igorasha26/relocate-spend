import { useSyncExternalStore } from 'react';
import { auth, rpc } from '@/shared/api';

/**
 * Группы трат (совместный бюджет): список групп, участники, приглашения.
 * Источник правды — база (RPC my_groups / my_invites); здесь — кеш на телефоне, чтобы офлайн
 * были видны названия групп и имена авторов. Траты групп живут в общем списке трат (Expense.groupId).
 */
export interface GroupMember {
  id: string;
  name: string;
  joinedAt: string;
}

export interface GroupInviteOut {
  id: string;
  email: string;
  expiresAt: string;
}

export interface Group {
  id: string;
  name: string;
  createdAt: string;
  members: GroupMember[];
  /** Ожидающие приглашения (почты), отправленные из этой группы. */
  invites: GroupInviteOut[];
}

/** Приглашение, адресованное мне. */
export interface GroupInviteIn {
  id: string;
  groupId: string;
  groupName: string;
  invitedBy: string;
  members: number;
}

export const MAX_GROUP_MEMBERS = 5;

interface GroupsState {
  userId: string | null;
  groups: Group[];
  invites: GroupInviteIn[];
  /** Список получен с сервера после входа (а не только из кеша). */
  fresh: boolean;
}

const KEY = 'relocate-spend:groups';
const listeners = new Set<() => void>();
let state: GroupsState = read();

function read(): GroupsState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null') as GroupsState | null;
    if (raw && Array.isArray(raw.groups)) return { ...raw, invites: raw.invites ?? [], fresh: false };
  } catch {
    /* нет кеша */
  }
  return { userId: null, groups: [], invites: [], fresh: false };
}

function set(next: GroupsState) {
  state = next;
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...next, fresh: false }));
  } catch {
    /* не критично */
  }
  listeners.forEach((l) => l());
}

let refreshing: Promise<void> | null = null;

export const groupsStore = {
  get: () => state,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /** Группы текущего пользователя (из кеша; для чужого/пустого кеша — пусто). */
  groups(): Group[] {
    const session = auth.getSession();
    return session && state.userId === session.user.id ? state.groups : [];
  },

  /** Я: id и имя (как меня видят участники групп). */
  me(): { id: string; name: string } | null {
    const session = auth.getSession();
    if (!session) return null;
    const asMember = state.groups.flatMap((g) => g.members).find((m) => m.id === session.user.id);
    return { id: session.user.id, name: asMember?.name ?? session.user.email.split('@')[0] ?? 'Я' };
  },

  /** Загрузить группы и приглашения с сервера. Ошибка сети — остаётся кеш. */
  refresh(): Promise<void> {
    const session = auth.getSession();
    if (!session) {
      if (state.userId) set({ userId: null, groups: [], invites: [], fresh: false });
      return Promise.resolve();
    }
    refreshing ??= (async () => {
      try {
        const [groups, invites] = await Promise.all([
          rpc<Group[]>('my_groups'),
          rpc<GroupInviteIn[]>('my_invites'),
        ]);
        set({ userId: session.user.id, groups: groups ?? [], invites: invites ?? [], fresh: true });
      } finally {
        refreshing = null;
      }
    })();
    return refreshing;
  },

  async createGroup(name: string): Promise<string> {
    const id = await rpc<string>('create_group', { p_name: name.trim() });
    await groupsStore.refresh();
    return id;
  },

  async invite(groupId: string, email: string) {
    await rpc('invite_to_group', { p_group: groupId, p_email: email.trim().toLowerCase() });
    await groupsStore.refresh();
  },

  async acceptInvite(inviteId: string): Promise<string> {
    const groupId = await rpc<string>('accept_invite', { p_invite: inviteId });
    await groupsStore.refresh();
    return groupId;
  },

  async declineInvite(inviteId: string) {
    await rpc('decline_invite', { p_invite: inviteId });
    await groupsStore.refresh();
  },

  /** Выйти из группы. true — группа удалена (вышел последний участник). */
  async leaveGroup(groupId: string): Promise<boolean> {
    const deleted = await rpc<boolean>('leave_group', { p_group: groupId });
    await groupsStore.refresh();
    return deleted;
  },

  async setDisplayName(name: string) {
    await rpc('set_display_name', { p_name: name });
    await groupsStore.refresh();
  },

  /** Выход из аккаунта: забыть группы этого пользователя. */
  clear() {
    set({ userId: null, groups: [], invites: [], fresh: false });
  },
};

const getSnapshot = () => state;

/** Группы и приглашения; перерисовка при изменениях. */
export function useGroups() {
  const s = useSyncExternalStore(groupsStore.subscribe, getSnapshot, getSnapshot);
  const session = auth.getSession();
  const mine = session && s.userId === session.user.id;
  return { groups: mine ? s.groups : [], invites: mine ? s.invites : [], fresh: Boolean(mine && s.fresh) };
}

/** Ошибки RPC групп → ключ перевода. */
export function groupErrorCode(error: unknown): 'group_full' | 'already_member' | 'invalid_email' | 'invite_not_found' | 'too_many_groups' | 'unknown' {
  const message = error instanceof Error ? error.message : '';
  for (const code of ['group_full', 'already_member', 'invalid_email', 'invite_not_found', 'too_many_groups'] as const) {
    if (message.includes(code)) return code;
  }
  return 'unknown';
}

/** Цвет участника: постоянный для одного человека (по id). */
export function memberColor(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return `c${(h % 8) + 1}`;
}
