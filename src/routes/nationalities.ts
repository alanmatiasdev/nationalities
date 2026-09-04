import { Hono } from 'hono';

import * as nationalities from '../services/nationalities';
import { datasetJson } from '../utils/cache';
import { errorResponse, notFound } from '../utils/errors';

/** Comprimento máximo aceito para o parâmetro `search`. */
const MAX_SEARCH_LENGTH = 100;

const app = new Hono();

// GET /v1/nationalities  (?search=...)
app.get('/', (c) => {
  const rawSearch = c.req.query('search');

  let results: readonly unknown[];
  if (rawSearch === undefined) {
    results = nationalities.list();
  } else if (rawSearch.length > MAX_SEARCH_LENGTH) {
    return errorResponse(
      c,
      400,
      'INVALID_PARAMETER',
      `The "search" parameter must be at most ${MAX_SEARCH_LENGTH} characters.`,
    );
  } else {
    results = nationalities.search(rawSearch);
  }

  return datasetJson(c, nationalities.datasetHash, {
    data: results,
    meta: { total: results.length, version: nationalities.meta.version },
  });
});

// GET /v1/nationalities/:code   (aceita lowercase)
app.get('/:code', (c) => {
  const code = c.req.param('code');
  const record = nationalities.getByCode(code);
  if (!record) return notFound(c, 'Nationality not found.');

  return datasetJson(c, `${nationalities.datasetHash}-${code.toUpperCase()}`, { data: record });
});

export default app;
