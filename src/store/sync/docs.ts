import { hashString } from '@/shared/lib/id';
import { isISODate } from '@/shared/lib/date';
import { sanitizeCategory, sanitizeExpense, sanitizeSettings } from '../storage';
import type { PersistedState, ScanRecord, SyncPatch } from '../types';

/**
 * Облачная копия хранится как набор «документов» (одна строка таблицы records = одна сущность):
 * kind = expense | category | settings | scan, id — id сущности, data — она сама в JSON.
 * Так синхронизация не зависит от формы данных: новое поле в расходе не требует миграции базы.
 */
export type DocKind = 'expense' | 'category' | 'settings' | 'scan';

export interface Doc {
  kind: DocKind;
  id: string;
  data: unknown;
}

export interface RemoteRow {
  kind: string;
  id: string;
  data: unknown;
  deleted: boolean;
  updated_at: string;
}

export const docKey = (kind: string, id: string) => `${kind}:${id}`;

/**
 * Пространство синхронизации: личные данные (таблица records) или группа трат (таблица group_records).
 * В группе синхронизируются только её траты.
 */
export type Space = { type: 'personal' } | { type: 'group'; id: string };
export const PERSONAL: Space = { type: 'personal' };

/** JSON с ключами по алфавиту и без undefined — одинаковые данные дают одинаковую строку. */
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((v) => (v === undefined ? 'null' : canonical(v))).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

/**
 * Отпечаток содержимого: по нему видно, что изменилось с прошлой синхронизации.
 * Порядок ключей не важен — после перезапуска данные проходят проверку и пересобираются в другом порядке.
 */
export function hashData(data: unknown): string {
  const json = canonical(data);
  return `${hashString(json)}.${json.length.toString(36)}`;
}

export function stateToDocs(state: PersistedState, space: Space = PERSONAL): Map<string, Doc> {
  const docs = new Map<string, Doc>();
  const put = (kind: DocKind, id: string, data: unknown) => docs.set(docKey(kind, id), { kind, id, data });
  if (space.type === 'group') {
    state.expenses.forEach((e) => e.groupId === space.id && put('expense', e.id, e));
    return docs;
  }
  state.expenses.forEach((e) => !e.groupId && put('expense', e.id, e));
  state.categories.forEach((c) => put('category', c.id, c));
  state.scans.forEach((s) => put('scan', s.id, s));
  put('settings', 'settings', state.settings);
  return docs;
}

export const emptyPatch = (): SyncPatch => ({
  expenses: { upsert: [], remove: [] },
  categories: { upsert: [], remove: [] },
  scans: { upsert: [], remove: [] },
});

export const isEmptyPatch = (p: SyncPatch) =>
  !p.settings &&
  [p.expenses, p.categories, p.scans].every((x) => x.upsert.length === 0 && x.remove.length === 0);

/**
 * Превращает строки из облака в изменения локального состояния.
 * Правило конфликтов: если запись изменена или удалена на этом устройстве и ещё не отправлена —
 * побеждает локальная версия (она уйдёт в облако следующим шагом). Иначе побеждает облако.
 * hashes обновляется на месте: для принятых записей запоминается их отпечаток.
 */
export function remoteToPatch(
  rows: RemoteRow[],
  state: PersistedState,
  hashes: Record<string, string>,
  space: Space = PERSONAL,
): SyncPatch {
  const patch = emptyPatch();
  const local = stateToDocs(state, space);
  // Категории из облака должны быть известны до проверки расходов
  const categoryIds = new Set(state.categories.map((c) => c.id));
  rows.forEach((r) => r.kind === 'category' && !r.deleted && categoryIds.add(r.id));

  for (const row of rows) {
    const key = docKey(row.kind, row.id);
    const mine = local.get(key);
    const known = hashes[key];
    if (mine && known !== undefined && hashData(mine.data) !== known) continue; // локальная правка ещё не отправлена

    if (row.deleted) {
      // Запись есть локально, а облако о ней «не знает» (отпечатка нет): её заново создали или вернули
      // на этом устройстве после удаления в облаке (например, забрали трату из группы в личные).
      // Старое удаление не должно её стереть — она уйдёт в облако при отправке.
      if (mine && known === undefined) continue;
      delete hashes[key];
      if (!mine) continue;
      if (row.kind === 'expense') patch.expenses.remove.push(row.id);
      else if (row.kind === 'category') patch.categories.remove.push(row.id);
      else if (row.kind === 'scan') patch.scans.remove.push(row.id);
      continue;
    }

    // В группе бывают только траты; принадлежность группе проставляем сами — не доверяем данным строки
    if (space.type === 'group' && row.kind !== 'expense') continue;
    const data = sanitizeRemote(
      space.type === 'group' ? { ...row, data: { ...(row.data as object), groupId: space.id } } : stripGroup(row),
      categoryIds,
    );
    if (data === null) continue;
    const remoteHash = hashData(data);
    // Удалено на этом устройстве и ещё не отправлено, а в облаке та же версия — удаление побеждает.
    // Если же в облаке запись успели изменить, побеждает изменение (запись вернётся).
    if (!mine && known !== undefined && known === remoteHash) continue;
    hashes[key] = remoteHash;
    if (mine && hashData(mine.data) === remoteHash) continue; // уже совпадает

    switch (row.kind) {
      case 'expense':
        patch.expenses.upsert.push(data as SyncPatch['expenses']['upsert'][number]);
        break;
      case 'category':
        patch.categories.upsert.push(data as SyncPatch['categories']['upsert'][number]);
        break;
      case 'scan':
        patch.scans.upsert.push(data as ScanRecord);
        break;
      case 'settings':
        patch.settings = data as SyncPatch['settings'];
        break;
    }
  }
  return patch;
}

/** Личная запись не может оказаться в группе. */
function stripGroup(row: RemoteRow): RemoteRow {
  if (row.kind !== 'expense' || !row.data || typeof row.data !== 'object') return row;
  const { groupId: _g, author: _a, editor: _e, categorySnapshot: _c, ...rest } = row.data as Record<string, unknown>;
  return { ...row, data: rest };
}

/** Данные из облака проходят ту же проверку, что и данные из localStorage. */
function sanitizeRemote(row: RemoteRow, categoryIds: Set<string>): unknown {
  const raw = row.data as Record<string, unknown> | null;
  if (!raw || typeof raw !== 'object') return null;
  switch (row.kind) {
    case 'expense':
      return sanitizeExpense({ ...raw, id: row.id }, categoryIds);
    case 'category':
      return sanitizeCategory({ ...raw, id: row.id });
    case 'settings':
      return sanitizeSettings(raw);
    case 'scan':
      return typeof raw.date === 'string' && isISODate(raw.date) ? { id: row.id, date: raw.date } : null;
    default:
      return null; // неизвестный тип из будущей версии — пропускаем
  }
}

/** Что отправить: новые/изменённые документы и удалённые (были отправлены, а теперь их нет). */
export function diffForPush(state: PersistedState, hashes: Record<string, string>, space: Space = PERSONAL) {
  const docs = stateToDocs(state, space);
  const changed: (Doc & { hash: string })[] = [];
  for (const [key, doc] of docs) {
    const hash = hashData(doc.data);
    if (hashes[key] !== hash) changed.push({ ...doc, hash });
  }
  const removed = Object.keys(hashes)
    .filter((key) => !docs.has(key))
    .map((key) => {
      const i = key.indexOf(':');
      return { key, kind: key.slice(0, i), id: key.slice(i + 1) };
    });
  return { changed, removed };
}
