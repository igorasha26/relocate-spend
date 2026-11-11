import { ApiError, supabaseRequest } from './http';

/**
 * Вход по почте и паролю через Supabase Auth (GoTrue REST API) — без сторонних библиотек.
 * Подтверждение почты и сброс пароля — по коду из письма, а не по ссылке:
 * ссылка на iPhone открывается в Safari, а не в установленном приложении (у них разные данные).
 */
export interface AuthUser {
  id: string;
  email: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  /** Unix-время (сек), когда истекает accessToken. */
  expiresAt: number;
  user: AuthUser;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  user: { id: string; email?: string };
}

const KEY = 'relocate-spend:auth';
const listeners = new Set<() => void>();
let current: Session | null = readStored();

function readStored(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    return s && typeof s.accessToken === 'string' && s.user?.id ? s : null;
  } catch {
    return null;
  }
}

function setSession(next: Session | null) {
  current = next;
  try {
    if (next) localStorage.setItem(KEY, JSON.stringify(next));
    else localStorage.removeItem(KEY);
  } catch {
    /* приватный режим — сессия живёт до закрытия вкладки */
  }
  listeners.forEach((l) => l());
}

function fromToken(r: TokenResponse): Session {
  return {
    accessToken: r.access_token,
    refreshToken: r.refresh_token,
    expiresAt: r.expires_at ?? Math.floor(Date.now() / 1000) + r.expires_in,
    user: { id: r.user.id, email: r.user.email ?? '' },
  };
}

const isTokenResponse = (r: unknown): r is TokenResponse =>
  typeof r === 'object' && r !== null && typeof (r as TokenResponse).access_token === 'string';

export const auth = {
  getSession: () => current,

  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Регистрация. Если в Supabase выключено подтверждение почты — сразу возвращает сессию,
   * иначе null: на почту ушёл код, его нужно ввести в verifyEmail.
   */
  async signUp(email: string, password: string): Promise<Session | null> {
    const r = await supabaseRequest<unknown>('/auth/v1/signup', { method: 'POST', body: { email, password } });
    if (isTokenResponse(r)) {
      const s = fromToken(r);
      setSession(s);
      return s;
    }
    // Supabase не раскрывает, занята ли почта: для существующей почты приходит пользователь без identities
    const identities = (r as { identities?: unknown[] } | null)?.identities;
    if (Array.isArray(identities) && identities.length === 0) {
      throw new ApiError(422, 'user_already_exists', 'User already registered');
    }
    return null;
  },

  async signIn(email: string, password: string): Promise<Session> {
    const r = await supabaseRequest<TokenResponse>('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: { email, password },
    });
    const s = fromToken(r);
    setSession(s);
    return s;
  },

  /** Код из письма: type 'email' — подтверждение регистрации, 'recovery' — сброс пароля. */
  async verifyCode(email: string, token: string, type: 'email' | 'recovery'): Promise<Session> {
    const r = await supabaseRequest<TokenResponse>('/auth/v1/verify', {
      method: 'POST',
      body: { email, token, type },
    });
    const s = fromToken(r);
    setSession(s);
    return s;
  },

  /** Отправить код подтверждения регистрации ещё раз. */
  resendSignupCode(email: string) {
    return supabaseRequest('/auth/v1/resend', { method: 'POST', body: { type: 'signup', email } });
  },

  /** Отправить код для сброса пароля. */
  sendRecoveryCode(email: string) {
    return supabaseRequest('/auth/v1/recover', { method: 'POST', body: { email } });
  },

  async updatePassword(password: string) {
    const token = await auth.getAccessToken();
    if (!token) throw new ApiError(401, 'no_session', 'Not signed in');
    await supabaseRequest('/auth/v1/user', { method: 'PUT', token, body: { password } });
  },

  /** Выход: сессия удаляется сразу, отзыв токена на сервере — по возможности. */
  async signOut() {
    const s = current;
    setSession(null);
    if (s) await supabaseRequest('/auth/v1/logout', { method: 'POST', token: s.accessToken }).catch(() => {});
  },

  /** Сессия истекла или отозвана — выходим без запроса на сервер. */
  dropSession() {
    setSession(null);
  },

  /** Действующий токен: при необходимости обновляется. null — пользователь не вошёл. */
  async getAccessToken(forceRefresh = false): Promise<string | null> {
    const s = current;
    if (!s) return null;
    const expiresSoon = s.expiresAt - Date.now() / 1000 < 60;
    if (!forceRefresh && !expiresSoon) return s.accessToken;
    try {
      return (await refresh(s)).accessToken;
    } catch (error) {
      if (error instanceof ApiError && error.isNetwork) return s.accessToken; // офлайн — попробуем позже
      if (current === s) setSession(null); // refresh-токен отозван: нужно войти заново
      return null;
    }
  },
};

let refreshing: Promise<Session> | null = null;

function refresh(s: Session): Promise<Session> {
  refreshing ??= supabaseRequest<TokenResponse>('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: { refresh_token: s.refreshToken },
  })
    .then((r) => {
      const next = fromToken(r);
      if (current?.user.id === s.user.id) setSession(next);
      return next;
    })
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}
