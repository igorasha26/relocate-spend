/**
 * Cloudflare Pages Function: GET /api/receipt?url=<ссылка из QR сербского чека>
 *
 * Сайт налоговой (suf.purs.gov.rs) не разрешает браузеру читать свои страницы (нет CORS),
 * поэтому приложение спрашивает этот сервер, а он — налоговую. Ответ налоговой в JSON
 * (Accept: application/json) разбирается в магазин, дату, сумму и позиции.
 *
 * Выкладывается автоматически вместе с сайтом (папка functions/ в корне репозитория).
 * Чек не меняется, поэтому ответ кешируется на сутки.
 */
import { parseSufResponse } from '../../src/features/receipt-scan/parseFiscal';

const HOST = 'suf.purs.gov.rs';

function json(status: number, body: unknown, cache = false): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': cache ? 'public, max-age=86400' : 'no-store',
    },
  });
}

interface Ctx {
  request: Request;
  waitUntil: (p: Promise<unknown>) => void;
}

export async function onRequestGet({ request, waitUntil }: Ctx): Promise<Response> {
  const qr = new URL(request.url).searchParams.get('url') ?? '';
  let target: URL;
  try {
    target = new URL(qr);
  } catch {
    return json(422, { error: 'notFiscal' });
  }
  if (target.protocol !== 'https:' || (target.hostname !== HOST && !target.hostname.endsWith(`.${HOST}`)) || !target.searchParams.get('vl')) {
    return json(422, { error: 'notFiscal' });
  }

  // Кеш Cloudflare: один и тот же чек не спрашиваем у налоговой дважды
  const cache = (globalThis as unknown as { caches?: { default?: Cache } }).caches?.default;
  const cacheKey = new Request(`https://receipt-cache.local/${encodeURIComponent(target.toString())}`);
  const cached = await cache?.match(cacheKey);
  if (cached) return cached;

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0 (RelocateSpend receipt reader)' },
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    return json(502, { error: 'unavailable' });
  }
  if (!upstream.ok) return json(upstream.status === 404 ? 422 : 502, { error: upstream.status === 404 ? 'notFiscal' : 'unavailable', status: upstream.status });

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return json(502, { error: 'unreadable' });
  }
  const receipt = parseSufResponse(data);
  if (!receipt) return json(422, { error: 'unreadable' });

  const response = json(200, receipt, true);
  if (cache) waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}
