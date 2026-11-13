import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError } from '@/shared/api';
import { ENV } from '@/shared/config/env';
import { useI18n } from '@/shared/i18n';
import styles from './AuthForm.module.css';

/**
 * Капча Cloudflare Turnstile. В обычном случае невидима: проверка проходит в фоне,
 * окошко «Я не робот» появляется только при подозрении на бота.
 * Токен одноразовый: после каждого запроса к Supabase — reset().
 */
interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(id: string): void;
  remove(id: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let loading: Promise<Turnstile> | null = null;

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<Turnstile>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
    script.onerror = () => {
      loading = null;
      reject(new Error('turnstile'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

const WAIT_MS = 20_000;

export interface Captcha {
  /** Блок для капчи — поставить в форму (обычно пустой и невидимый). */
  node: ReactNode;
  /** Дождаться токена (undefined — капча не настроена). */
  token: () => Promise<string | undefined>;
  /** Сбросить после запроса: токен одноразовый. */
  reset: () => void;
}

export function useCaptcha(): Captcha {
  const { language } = useI18n();
  const siteKey = ENV.turnstileSiteKey;
  // callback-ref: блок капчи может перемонтироваться при смене шага формы — тогда рендерим заново
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const widget = useRef<string | null>(null);
  const current = useRef<string | null>(null);
  const waiters = useRef<((token: string | null) => void)[]>([]);

  const settle = (token: string | null) => {
    current.current = token;
    if (token) {
      waiters.current.forEach((resolve) => resolve(token));
      waiters.current = [];
    }
  };

  useEffect(() => {
    if (!siteKey || !el) return;
    let cancelled = false;
    current.current = null;
    loadTurnstile()
      .then((ts) => {
        if (cancelled) return;
        widget.current = ts.render(el, {
          sitekey: siteKey,
          appearance: 'interaction-only',
          theme: document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
          language: language === 'sr' ? 'sr' : language,
          callback: (token: string) => settle(token),
          'expired-callback': () => settle(null),
          'error-callback': () => settle(null),
        });
      })
      .catch(() => {
        /* скрипт не загрузился — запрос уйдёт без токена, Supabase вернёт понятную ошибку */
      });
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
    };
  }, [siteKey, language, el]);

  const token = useCallback(async () => {
    if (!siteKey) return undefined;
    if (current.current) return current.current;
    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => reject(new ApiError(0, 'captcha_timeout', 'captcha timeout')), WAIT_MS);
      waiters.current.push((t) => {
        clearTimeout(timer);
        if (t) resolve(t);
      });
    });
  }, [siteKey]);

  const reset = useCallback(() => {
    current.current = null;
    if (widget.current) window.turnstile?.reset(widget.current);
  }, []);

  return { node: siteKey ? <div ref={setEl} className={styles.captcha} /> : null, token, reset };
}
