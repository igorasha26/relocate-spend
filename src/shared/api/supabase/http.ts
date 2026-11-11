import { ENV, HAS_BACKEND } from '@/shared/config/env';

/** Ошибка запроса к Supabase в одном виде — и для входа (GoTrue), и для таблиц (PostgREST). */
export class ApiError extends Error {
  /** HTTP-статус; 0 — нет сети или сервер недоступен. */
  readonly status: number;
  /** Машинный код: invalid_credentials, user_already_exists, otp_expired, network… */
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }

  get isNetwork() {
    return this.status === 0;
  }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  /** Токен пользователя; без него запрос идёт с публичным ключом (как гость). */
  token?: string;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

const TIMEOUT_MS = 15_000;

/** Низкоуровневый запрос к API Supabase: /auth/v1/…, /rest/v1/… */
export async function supabaseRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  if (!HAS_BACKEND) throw new ApiError(0, 'not_configured', 'Supabase is not configured');
  const { method = 'GET', body, token, headers = {}, signal } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  signal?.addEventListener('abort', () => controller.abort());

  let response: Response;
  try {
    response = await fetch(`${ENV.supabase.url}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        apikey: ENV.supabase.anonKey!,
        // Новые ключи (sb_publishable_…) — не JWT, в Authorization их не кладём: без токена запрос идёт как гость.
        // Старый anon-ключ (eyJ…) — JWT, его передаём как раньше.
        ...(token
          ? { Authorization: `Bearer ${token}` }
          : ENV.supabase.anonKey!.startsWith('eyJ')
            ? { Authorization: `Bearer ${ENV.supabase.anonKey}` }
            : {}),
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'network', 'Network request failed');
  } finally {
    clearTimeout(timer);
  }

  const text = await response.text();
  let data: unknown = undefined;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) throw toApiError(response.status, data);
  return data as T;
}

function toApiError(status: number, data: unknown): ApiError {
  const d = (typeof data === 'object' && data !== null ? data : {}) as Record<string, unknown>;
  const code = String(d.error_code ?? d.code ?? d.error ?? status);
  const message = String(d.msg ?? d.message ?? d.error_description ?? d.error ?? `HTTP ${status}`);
  return new ApiError(status, code, message);
}
