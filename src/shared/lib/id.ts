/**
 * `crypto.randomUUID` есть только в secure context (https / localhost).
 * При открытии dev-сервера с телефона по http://192.168.x.x его нет —
 * раньше это роняло добавление траты. Поэтому здесь есть запасной вариант.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Короткий стабильный хеш строки (djb2) — для идентификации без хранения исходного текста. */
export function hashString(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(36);
}
