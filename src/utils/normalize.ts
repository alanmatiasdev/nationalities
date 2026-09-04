/**
 * Normaliza uma string para comparações case-insensitive e accent-insensitive,
 * usando apenas APIs nativas do JavaScript.
 *
 *   normalize('São Tomé e Príncipe') === 'sao tome e principe'
 *   normalize('Japão') === 'japao'
 */
export function normalize(input: string): string {
  return input
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}
