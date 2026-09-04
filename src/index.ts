import { Hono } from 'hono';
import { cors } from 'hono/cors';

import countries from './routes/countries';
import nationalities from './routes/nationalities';
import * as service from './services/nationalities';
import { datasetJson } from './utils/cache';
import { errorResponse, notFound } from './utils/errors';

const app = new Hono();

// API pública: CORS liberado para leitura.
app.use(
  '*',
  cors({
    origin: '*',
    allowMethods: ['GET', 'HEAD', 'OPTIONS'],
    maxAge: 86400,
  }),
);

// Somente métodos de leitura. Preflight OPTIONS já foi tratado pelo CORS acima.
app.use('*', async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD') {
    return errorResponse(
      c,
      405,
      'METHOD_NOT_ALLOWED',
      `Method ${c.req.method} is not allowed on this API.`,
    );
  }
  await next();
});

// Health check — sem versão, cache curto.
app.get('/health', (c) => {
  c.header('Cache-Control', 'public, max-age=60');
  return c.json({ status: 'ok' });
});

/**
 * JSON estático versionado. Em produção é servido pelo Cloudflare Static Assets
 * (public/v1/nationalities.json) sem invocar o Worker; esta rota é um fallback
 * equivalente para desenvolvimento e testes.
 */
app.get('/v1/nationalities.json', (c) =>
  datasetJson(c, service.datasetHash, { meta: service.meta, data: service.list() }),
);

app.route('/v1/nationalities', nationalities);
app.route('/v1/countries', countries);

app.notFound((c) => notFound(c, 'Resource not found.'));

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return errorResponse(c, 500, 'INTERNAL_ERROR', 'An unexpected error occurred.');
});

export default app;
