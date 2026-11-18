/**
 * Разбор сербского фискального чека (suf.purs.gov.rs).
 * Модуль без зависимостей: его используют и приложение, и серверная функция Cloudflare
 * (functions/api/receipt.ts).
 */

export interface FiscalItem {
  name: string;
  /** Сумма по позиции (цена × количество). */
  price: number;
}

export interface FiscalReceipt {
  merchant: string;
  /** YYYY-MM-DD, местное время Сербии. */
  date: string;
  /** HH:MM */
  time: string;
  amount: number;
  currency: 'RSD';
  items: FiscalItem[];
  /** Подсказка категории по магазину: food / medicine / furniture… */
  categoryHint?: string;
  /** Чек возврата (refund) — сумма с минусом по смыслу. */
  refund?: boolean;
}

// ---------------------------------------------------------------- QR без сети

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToBytes(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/]/g, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buf = 0;
  let bits = 0;
  let o = 0;
  for (const ch of clean) {
    buf = (buf << 6) | B64.indexOf(ch);
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o++] = (buf >> bits) & 0xff;
    }
  }
  return out.subarray(0, o);
}

/** Местные дата и время Сербии для момента в UTC. */
export function belgradeDateTime(ms: number): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Belgrade',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
}

/**
 * Сумма и время покупки прямо из QR — без интернета.
 * В параметре vl зашиты: версия, номер кассы (2 × 8 байт), счётчики, сумма (int64 LE, /10000)
 * и время ПФР (int64 BE, мс от 1970).
 */
export function decodeFiscalQr(url: string): { amount: number; date: string; time: string; refund: boolean } | null {
  try {
    const vl = new URL(url.trim()).searchParams.get('vl');
    if (!vl) return null;
    const b = base64ToBytes(vl);
    if (b.length < 44) return null;
    let amount = 0;
    for (let i = 7; i >= 0; i--) amount = amount * 256 + (b[25 + i] ?? 0);
    let ms = 0;
    for (let i = 0; i < 8; i++) ms = ms * 256 + (b[33 + i] ?? 0);
    // 41 — тип чека (0 — обычный), 42 — тип транзакции (0 — продажа, 1 — возврат)
    const refund = b[42] === 1;
    if (!(amount > 0) || ms < Date.UTC(2021, 0, 1) || ms > Date.UTC(2100, 0, 1)) return null;
    return { amount: Math.round(amount / 100) / 100, ...belgradeDateTime(ms), refund };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------- ответ налоговой

/** «1.741,85» → 1741.85 */
function num(s: string): number {
  return Number(s.replace(/\./g, '').replace(',', '.'));
}

const ITEM_NUMBERS = /^\s*(-?[\d.]+,\d{2})\s+(-?[\d.,]+)\s+(-?[\d.]+,\d{2})\s*$/;

/** Название позиции без служебного: «Hleb beli rezani/KOM/0225542 (Е)» → «Hleb beli rezani». */
export function cleanItemName(raw: string): string {
  let s = raw.replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*\([^()]{1,3}\)\s*$/, ''); // метка налога (Ђ), (Е), (А)…
  s = s.replace(/\s*\/\s*\d{4,}\s*$/, ''); // артикул в конце: /0083215
  s = s.replace(/\s*\/\s*(kom|kg|kom\.|kgm|l|lit|pak|kut|g|m|par)\b\.?\s*(\/\s*\d+)?\s*$/i, ''); // /KOM, /kom/7005191
  s = s.replace(/\s+(kom|kg|kgm|kom\.)\s*$/i, ''); // «PILECI FILE kg»
  s = s.replace(/\s*\/\s*$/, '').trim();
  // КАПС → «Как в предложении», чтобы список читался
  if (s === s.toUpperCase() && /[A-ZА-ЯŠĐČĆŽЂЈЉЊЋЏ]{3}/.test(s)) s = s.charAt(0) + s.slice(1).toLowerCase();
  return s || raw.trim();
}

function formatQty(qty: number): string {
  return Number.isInteger(qty) ? String(qty) : String(qty).replace('.', ',');
}

/** Позиции из текста чека («journal»). */
export function parseJournalItems(journal: string): FiscalItem[] {
  const lines = journal.split(/\r?\n/);
  const start = lines.findIndex((l) => /Назив\s+Цена\s+Кол/.test(l) || /Naziv\s+Cena\s+Kol/i.test(l));
  if (start < 0) return [];
  const items: FiscalItem[] = [];
  let name: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? '';
    if (/^-{10,}/.test(line.trim()) || /^={10,}/.test(line.trim())) break;
    const m = ITEM_NUMBERS.exec(line);
    if (m && name.length) {
      const unit = num(m[1] ?? '0');
      const qty = num(m[2] ?? '1');
      const total = num(m[3] ?? '0');
      let title = cleanItemName(name.join(' '));
      if (qty !== 1) title += `, ${formatQty(qty)} × ${String(unit.toFixed(2)).replace('.', ',')}`;
      items.push({ name: title, price: total });
      name = [];
    } else if (line.trim()) {
      name.push(line.trim());
    }
  }
  return items;
}

/** «ПФР време: 07.11.2026. 17:08:01» → местные дата и время с чека. */
function journalDateTime(journal: string): { date: string; time: string } | null {
  const m = /(?:ПФР време|PFR vreme)[^\d]*(\d{2})\.(\d{2})\.(\d{4})\.?\s+(\d{2}):(\d{2})/i.exec(journal);
  return m ? { date: `${m[3]}-${m[2]}-${m[1]}`, time: `${m[4]}:${m[5]}` } : null;
}

// ---------------------------------------------------------------- магазин

const LEGAL = /\b(d\.?o\.?o\.?|doo|a\.?d\.?|ad|k\.?d\.?|kd|preduzetnik|pr|str|szr|stur|szur|ortačko|društvo|beograd|novi sad|sremska kamenica|petrovaradin|kukujevci)\b\.?/gi;

/** Сети, где по юрлицу не понять вывеску, — берём вывеску из названия точки. */
const BY_LOCATION = /DELHAIZE|MERCATOR|TEMPO|DIS DOO|DM DROGERIE|LILLY|BENU|PHOENIX|JANAF|NIS |MOL /i;

const BRANDS: [RegExp, string][] = [
  [/\bLIDL\b/i, 'Lidl'],
  [/\bMAXI\b/i, 'Maxi'],
  [/SHOP\s*&?\s*GO/i, 'Shop&Go'],
  [/\bTEMPO\b/i, 'Tempo'],
  [/\bIDEA\b/i, 'Idea'],
  [/\bRODA\b/i, 'Roda'],
  [/\bUNIVEREXPORT\b/i, 'Univerexport'],
  [/\bAROMA\b/i, 'Aroma'],
  [/\bDIS\b/i, 'DIS'],
  [/\bDM\b.*DROGERIE|\bDROGERIE MARKT/i, 'dm'],
  [/\bLILLY\b/i, 'Lilly'],
  [/\bBENU\b/i, 'Benu'],
  [/\bIKEA\b/i, 'IKEA'],
  [/\bJYSK\b/i, 'JYSK'],
  [/\bTEHNOMANIJA\b/i, 'Tehnomanija'],
  [/\bGIGATRON\b/i, 'Gigatron'],
  [/\bMCDONALD/i, "McDonald's"],
  [/\bNIS\b|\bGAZPROM\b/i, 'NIS'],
];

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .replace(/(^|[\s\-"„(])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase())
    .replace(/\b(Ns|Bg|Dm)\b/g, (w) => w.toUpperCase());
}

/** Понятное имя магазина: «LIDL SRBIJA KD» → «Lidl», «AGRO- PAPUK DOO» + «NAŠA KUĆA MESA BR.47» → «Naša kuća mesa». */
export function merchantName(businessName: string, locationName: string): string {
  const loc = locationName.replace(/^\d+\s*-\s*/, '').trim(); // «1057448-Prodavnica br. 0163» → «Prodavnica br. 0163»
  const both = `${businessName} ${loc}`;
  for (const [re, brand] of BRANDS) if (re.test(both)) return brand;

  const genericLoc = !loc || /^(prodavnica|пј|pj|објекат|objekat|radnja|maloprodaj|market)\b/i.test(loc) || /^[\d\s.,\-/]+$/.test(loc);
  if (!genericLoc && (BY_LOCATION.test(businessName) || /\p{L}{4}/u.test(loc))) {
    const name = loc.replace(/\s*(br\.?|бр\.?|no\.?)\s*\d+\s*$/i, '').replace(/\s+\d+\s*$/, '').trim();
    if (name.length >= 3) return titleCase(name);
  }
  const company = businessName.replace(LEGAL, ' ').replace(/["„”]/g, '').replace(/\s*-\s*$/, '').replace(/\s+/g, ' ').trim();
  return titleCase(company || businessName.trim());
}

const CATEGORY_HINTS: [RegExp, string][] = [
  [/APOTEK|АПОТЕК|PHARM|BENU|LILLY|DROGERI|ZDRAVLJ|KLINIK|ORDINACIJ|POLIKLINIK|LABORATORIJ/i, 'medicine'],
  [/IKEA|JYSK|NAMEŠTAJ|NAMESTAJ|FORMA IDEALE|DIMEX|EMMEZETA|HOME CENTER|PEPCO|TEHNOMANIJA|GIGATRON|BAUHAUS|OBI\b/i, 'furniture'],
  [/A1 SRBIJA|YETTEL|TELEKOM|MTS\b|SBB|ORION TELEKOM/i, 'internet'],
  [/NIS\b|GAZPROM|MOL\b|OMV|LUKOIL|EKO SERBIA|PETROL|GSP|TAKSI|TAXI|CARGO/i, 'transport'],
  [/LIDL|MAXI|DELHAIZE|MERCATOR|IDEA|RODA|TEMPO|UNIVEREXPORT|AROMA|DIS\b|MARKET|PEKAR|MESAR|MESA|KUĆA MESA|PIJAC|VOĆE|POVRĆE|SUPERMARKET|HIPERMARKET/i, 'food'],
];

export function guessCategory(businessName: string, locationName: string): string | undefined {
  const both = `${businessName} ${locationName}`;
  return CATEGORY_HINTS.find(([re]) => re.test(both))?.[1];
}

interface SufResponse {
  invoiceRequest?: { businessName?: string; locationName?: string; transactionType?: number };
  invoiceResult?: { totalAmount?: number; sdcTime?: string };
  journal?: string;
  isValid?: boolean;
}

/** JSON-ответ suf.purs.gov.rs (запрос с Accept: application/json) → чек приложения. */
export function parseSufResponse(data: unknown): FiscalReceipt | null {
  if (typeof data !== 'object' || data === null) return null;
  const d = data as SufResponse;
  const req = d.invoiceRequest;
  const res = d.invoiceResult;
  if (!req || !res || typeof res.totalAmount !== 'number') return null;
  const journal = typeof d.journal === 'string' ? d.journal : '';
  const when =
    journalDateTime(journal) ?? (res.sdcTime ? belgradeDateTime(Date.parse(res.sdcTime)) : null);
  if (!when) return null;
  const business = req.businessName ?? '';
  const location = req.locationName ?? '';
  const refund = req.transactionType === 1;
  return {
    merchant: merchantName(business, location),
    date: when.date,
    time: when.time,
    amount: Math.abs(res.totalAmount),
    currency: 'RSD',
    items: parseJournalItems(journal),
    categoryHint: guessCategory(business, location),
    ...(refund ? { refund } : {}),
  };
}
