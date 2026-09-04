import { Hono } from 'hono';

import * as nationalities from '../services/nationalities';
import { datasetJson } from '../utils/cache';
import { notFound } from '../utils/errors';

const app = new Hono();

// GET /v1/countries  -> representação simplificada { code, iso3, name }
app.get('/', (c) => {
  const data = nationalities.listCountries();
  return datasetJson(c, `${nationalities.datasetHash}-countries`, {
    data,
    meta: { total: data.length, version: nationalities.meta.version },
  });
});

// GET /v1/countries/:code   (aceita lowercase)
app.get('/:code', (c) => {
  const code = c.req.param('code');
  const record = nationalities.getByCode(code);
  if (!record) return notFound(c, 'Country not found.');

  return datasetJson(c, `${nationalities.datasetHash}-${code.toUpperCase()}`, { data: record });
});

export default app;
