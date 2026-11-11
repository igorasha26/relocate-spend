import { restRequest } from '@/shared/api';
import { ENV } from '@/shared/config/env';

export type FeedbackKind = 'idea' | 'bug' | 'other';

export interface FeedbackInput {
  kind: FeedbackKind;
  message: string;
  contact?: string;
  language: string;
}

/**
 * Отзыв сохраняется в таблицу feedback (гостям тоже можно — правило RLS разрешает вставку).
 * user_id база проставит сама, если человек вошёл. Уведомление в Telegram шлёт триггер в базе.
 */
export async function sendFeedback(input: FeedbackInput) {
  await restRequest('feedback', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: {
      kind: input.kind,
      message: input.message.trim().slice(0, 4000),
      contact: input.contact?.trim().slice(0, 200) || null,
      app_version: ENV.version,
      app_env: ENV.appEnv,
      language: input.language,
      platform: navigator.userAgent.slice(0, 300),
      page: location.pathname,
    },
  });
}
