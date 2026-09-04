import { describe, expect, it } from 'vitest';

import app from '../src/index';

const json = (res: Response) => res.json() as Promise<Record<string, unknown>>;

describe('GET /health', () => {
  it('responde 200 com status ok', async () => {
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    expect(await json(res)).toEqual({ status: 'ok' });
  });
});

describe('GET /v1/nationalities', () => {
  it('lista com data e meta', async () => {
    const res = await app.request('/v1/nationalities');
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(Array.isArray(body.data)).toBe(true);
    expect((body.data as unknown[]).length).toBeGreaterThan(200);
    expect(body.meta).toMatchObject({ total: (body.data as unknown[]).length });
    expect((body.meta as Record<string, unknown>).version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('busca por nome de país (case-insensitive)', async () => {
    const res = await app.request('/v1/nationalities?search=BRASIL');
    expect(res.status).toBe(200);
    const body = await json(res);
    const codes = (body.data as Array<{ code: string }>).map((r) => r.code);
    expect(codes).toContain('BR');
  });

  it('busca accent-insensitive: "japao" encontra Japão', async () => {
    const res = await app.request('/v1/nationalities?search=japao');
    const body = await json(res);
    const found = (body.data as Array<{ code: string; country: { 'pt-BR': string } }>).find(
      (r) => r.code === 'JP',
    );
    expect(found?.country['pt-BR']).toBe('Japão');
  });

  it('busca por gentílico feminino', async () => {
    const res = await app.request('/v1/nationalities?search=brasileira');
    const body = await json(res);
    const codes = (body.data as Array<{ code: string }>).map((r) => r.code);
    expect(codes).toEqual(['BR']);
  });

  it('rejeita search maior que 100 caracteres com 400', async () => {
    const res = await app.request(`/v1/nationalities?search=${'a'.repeat(101)}`);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect((body.error as Record<string, unknown>).code).toBe('INVALID_PARAMETER');
  });
});

describe('GET /v1/nationalities/:code', () => {
  it('BR retorna Brasil', async () => {
    const res = await app.request('/v1/nationalities/BR');
    expect(res.status).toBe(200);
    const body = await json(res);
    expect((body.data as { country: { 'pt-BR': string } }).country['pt-BR']).toBe('Brasil');
    expect(
      (body.data as { nationality: { 'pt-BR': { male: string } } }).nationality['pt-BR'].male,
    ).toBe('brasileiro');
  });

  it('aceita lowercase', async () => {
    const res = await app.request('/v1/nationalities/br');
    expect(res.status).toBe(200);
    const body = await json(res);
    expect((body.data as { code: string }).code).toBe('BR');
  });

  it('código inexistente retorna 404 no formato de erro', async () => {
    const res = await app.request('/v1/nationalities/XX');
    expect(res.status).toBe(404);
    const body = await json(res);
    expect(body.error).toEqual({ code: 'NOT_FOUND', message: 'Nationality not found.' });
  });
});

describe('GET /v1/countries', () => {
  it('retorna representação simplificada', async () => {
    const res = await app.request('/v1/countries');
    expect(res.status).toBe(200);
    const body = await json(res);
    const first = (body.data as Array<Record<string, unknown>>)[0];
    expect(Object.keys(first ?? {}).sort()).toEqual(['code', 'iso3', 'name']);
  });

  it('/v1/countries/br retorna BR', async () => {
    const res = await app.request('/v1/countries/br');
    expect(res.status).toBe(200);
    const body = await json(res);
    expect((body.data as { code: string }).code).toBe('BR');
  });

  it('/v1/countries/XX retorna 404', async () => {
    const res = await app.request('/v1/countries/XX');
    expect(res.status).toBe(404);
  });
});

describe('GET /v1/nationalities.json (fallback do asset estático)', () => {
  it('retorna meta + data completos', async () => {
    const res = await app.request('/v1/nationalities.json');
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.meta).toBeDefined();
    expect((body.data as unknown[]).length).toBeGreaterThan(200);
  });
});

describe('CORS', () => {
  it('expõe Access-Control-Allow-Origin: *', async () => {
    const res = await app.request('/v1/nationalities', {
      headers: { Origin: 'https://example.com' },
    });
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('responde ao preflight OPTIONS', async () => {
    const res = await app.request('/v1/nationalities', {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://example.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    expect([200, 204]).toContain(res.status);
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });
});

describe('Cache', () => {
  it('define os cabeçalhos de cache agressivo e ETag', async () => {
    const res = await app.request('/v1/nationalities');
    expect(res.headers.get('cache-control')).toBe(
      'public, max-age=86400, stale-while-revalidate=604800',
    );
    expect(res.headers.get('cloudflare-cdn-cache-control')).toBe('public, max-age=2592000');
    expect(res.headers.get('etag')).toMatch(/^"[a-f0-9]{64}"$/);
  });

  it('responde 304 quando If-None-Match casa com o ETag', async () => {
    const first = await app.request('/v1/nationalities');
    const etag = first.headers.get('etag') as string;

    const second = await app.request('/v1/nationalities', {
      headers: { 'If-None-Match': etag },
    });
    expect(second.status).toBe(304);
    expect(await second.text()).toBe('');
  });
});

describe('Métodos HTTP', () => {
  it('POST retorna 405', async () => {
    const res = await app.request('/v1/nationalities', { method: 'POST' });
    expect(res.status).toBe(405);
    const body = await json(res);
    expect((body.error as Record<string, unknown>).code).toBe('METHOD_NOT_ALLOWED');
  });

  it('rota desconhecida retorna 404', async () => {
    const res = await app.request('/v1/unknown');
    expect(res.status).toBe(404);
    const body = await json(res);
    expect((body.error as Record<string, unknown>).code).toBe('NOT_FOUND');
  });
});
