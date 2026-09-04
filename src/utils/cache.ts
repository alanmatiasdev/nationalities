import type { Context } from 'hono';

/**
 * Política de cache para endpoints de dataset (dados que mudam raramente):
 *
 *   browser:          24 h  (max-age)
 *   Cloudflare edge:  30 dias (Cloudflare-CDN-Cache-Control)
 *   stale-while-revalidate: 7 dias
 *
 * O ETag é derivado do hash do dataset (ver scripts/build-data.ts), então muda
 * somente quando os dados mudam. Requisições com `If-None-Match` correspondente
 * recebem `304 Not Modified`.
 */
const CACHE_CONTROL = 'public, max-age=86400, stale-while-revalidate=604800';
const CDN_CACHE_CONTROL = 'public, max-age=2592000';

export function applyDatasetCacheHeaders(c: Context, etagValue: string): string {
  const etag = `"${etagValue}"`;
  c.header('Cache-Control', CACHE_CONTROL);
  c.header('Cloudflare-CDN-Cache-Control', CDN_CACHE_CONTROL);
  c.header('ETag', etag);
  c.header('Vary', 'Accept-Encoding');
  return etag;
}

function matchesIfNoneMatch(headerValue: string | undefined, etag: string): boolean {
  if (!headerValue) return false;
  if (headerValue.trim() === '*') return true;
  return headerValue
    .split(',')
    .map((part) => part.trim())
    .some((candidate) => candidate === etag || candidate === `W/${etag}`);
}

/**
 * Serializa `payload` como JSON com os cabeçalhos de cache do dataset.
 * Retorna `304` (sem corpo) quando o `If-None-Match` da requisição bate com o ETag.
 */
export function datasetJson(c: Context, etagValue: string, payload: unknown): Response {
  const etag = applyDatasetCacheHeaders(c, etagValue);
  if (matchesIfNoneMatch(c.req.header('If-None-Match'), etag)) {
    return c.body(null, 304);
  }
  return c.json(payload as never);
}
