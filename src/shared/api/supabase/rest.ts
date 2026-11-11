import { auth } from './auth';
import { ApiError, supabaseRequest, type RequestOptions } from './http';

/**
 * Запрос к таблицам (PostgREST) от имени текущего пользователя.
 * Протухший токен обновляется и запрос повторяется один раз.
 */
export async function restRequest<T>(path: string, options: Omit<RequestOptions, 'token'> = {}): Promise<T> {
  const token = (await auth.getAccessToken()) ?? undefined;
  try {
    return await supabaseRequest<T>(`/rest/v1/${path}`, { ...options, token });
  } catch (error) {
    if (token && error instanceof ApiError && error.status === 401) {
      const fresh = await auth.getAccessToken(true);
      if (fresh) return supabaseRequest<T>(`/rest/v1/${path}`, { ...options, token: fresh });
    }
    throw error;
  }
}

/** Вызов SQL-функции: rpc('delete_my_account'). */
export function rpc<T = unknown>(fn: string, args: Record<string, unknown> = {}) {
  return restRequest<T>(`rpc/${fn}`, { method: 'POST', body: args });
}
