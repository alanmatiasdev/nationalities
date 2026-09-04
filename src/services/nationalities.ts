import datasetJson from '../../data/nationalities.json';
import type { CountrySummary, Dataset, DatasetMeta, Nationality } from '../schemas/nationality';
import { normalize } from '../utils/normalize';

/**
 * Dataset carregado em memória na inicialização do Worker. ~250 registros —
 * nenhuma leitura externa por request, nenhum índice complexo.
 */
const dataset = datasetJson as Dataset;

const records: readonly Nationality[] = dataset.data;
export const meta: DatasetMeta = dataset.meta;
export const datasetHash: string = dataset.meta.hash;

const byCode = new Map<string, Nationality>(records.map((r) => [r.code, r]));

/** Índice de busca: um "haystack" normalizado por registro. */
const searchIndex: ReadonlyArray<{ record: Nationality; haystack: string }> = records.map(
  (record) => ({
    record,
    haystack: [
      record.country['pt-BR'],
      record.country.en,
      record.nationality['pt-BR'].male,
      record.nationality['pt-BR'].female,
      record.code,
      record.iso3,
    ]
      .map(normalize)
      .join(' '),
  }),
);

export function list(): readonly Nationality[] {
  return records;
}

export function getByCode(code: string): Nationality | undefined {
  return byCode.get(code.toUpperCase());
}

/**
 * Busca case/accent-insensitive por nome do país (pt-BR e en), gentílicos
 * masculino/feminino, ISO alpha-2 e ISO alpha-3.
 */
export function search(query: string): readonly Nationality[] {
  const needle = normalize(query);
  if (!needle) return records;
  return searchIndex
    .filter((entry) => entry.haystack.includes(needle))
    .map((entry) => entry.record);
}

export function listCountries(): CountrySummary[] {
  return records.map((r) => ({ code: r.code, iso3: r.iso3, name: r.country['pt-BR'] }));
}
