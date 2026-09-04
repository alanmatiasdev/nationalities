import { describe, expect, it } from 'vitest';

import { normalize } from '../src/utils/normalize';

describe('normalize', () => {
  it('remove acentos', () => {
    expect(normalize('São Tomé e Príncipe')).toBe('sao tome e principe');
    expect(normalize('Japão')).toBe('japao');
  });

  it('é case-insensitive', () => {
    expect(normalize('BRASIL')).toBe('brasil');
    expect(normalize('Brasil')).toBe('brasil');
  });

  it('faz trim das bordas', () => {
    expect(normalize('  Brasil  ')).toBe('brasil');
  });

  it('mantém texto sem acento intacto', () => {
    expect(normalize('argentina')).toBe('argentina');
  });
});
