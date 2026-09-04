import { describe, expect, it } from 'vitest';

import dataset from '../data/nationalities.json';
import { isNationality, type Dataset } from '../src/schemas/nationality';

const { data, meta } = dataset as Dataset;

describe('data/nationalities.json', () => {
  it('meta é coerente', () => {
    expect(meta.total).toBe(data.length);
    expect(meta.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(meta.source.repository).toBe('mledoze/countries');
    expect(meta.source.ref).toMatch(/^[a-f0-9]{40}$/);
  });

  it('todo registro tem ISO alpha-2 e alpha-3 válidos', () => {
    for (const r of data) {
      expect(r.code).toMatch(/^[A-Z]{2}$/);
      expect(r.iso3).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('não há códigos duplicados', () => {
    const codes = data.map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('todo registro tem nome pt-BR e estrutura válida', () => {
    for (const r of data) {
      expect(r.country['pt-BR'].length).toBeGreaterThan(0);
      expect(isNationality(r)).toBe(true);
    }
  });

  it('registros curados têm gentílico masculino e feminino', () => {
    const curated = data.filter((r) => !r.needsReview);
    for (const r of curated) {
      expect(r.nationality['pt-BR'].male.length).toBeGreaterThan(0);
      expect(r.nationality['pt-BR'].female.length).toBeGreaterThan(0);
    }
    expect(curated.length).toBeGreaterThan(100);
  });

  it('meta.unreviewed corresponde à contagem de needsReview', () => {
    expect(data.filter((r) => r.needsReview).length).toBe(meta.unreviewed);
  });

  it('Brasil está curado corretamente', () => {
    const br = data.find((r) => r.code === 'BR');
    expect(br).toMatchObject({
      code: 'BR',
      iso3: 'BRA',
      country: { 'pt-BR': 'Brasil', en: 'Brazil' },
      nationality: { 'pt-BR': { male: 'brasileiro', female: 'brasileira' } },
    });
  });
});
