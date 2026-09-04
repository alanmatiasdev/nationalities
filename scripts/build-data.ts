/**
 * Combina o dataset upstream (mledoze/countries) com a camada editorial
 * brasileira (data/pt-BR.json) e gera os artefatos:
 *
 *   data/nationalities.json          -> fonte de verdade da API (importado pelo Worker)
 *   public/v1/nationalities.json     -> cópia servida como Static Asset
 *   public/_headers                  -> cabeçalhos de cache do asset estático
 *
 *   npm run build:data
 *
 * Não faz download. Roda `npm run sync:countries` antes se precisar atualizar o upstream.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Dataset, Nationality } from '../src/schemas/nationality';

interface UpstreamCountry {
  cca2: string;
  cca3: string;
  ccn3?: string;
  name: { common: string; official: string };
  translations?: { por?: { common?: string; official?: string } };
  region: string;
  subregion: string;
  independent: boolean | null;
  unMember: boolean;
  flag: string;
}

interface PtBrOverride {
  country?: string;
  nationality?: { male?: string; female?: string };
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async <T>(rel: string): Promise<T> =>
  JSON.parse(await readFile(resolve(ROOT, rel), 'utf8')) as T;

function buildRecord(c: UpstreamCountry, override: PtBrOverride | undefined): Nationality {
  const male = override?.nationality?.male?.trim() ?? '';
  const female = override?.nationality?.female?.trim() ?? '';
  const countryPt = override?.country?.trim() || c.translations?.por?.common?.trim() || '';

  const record: Nationality = {
    code: c.cca2,
    iso3: c.cca3,
    numericCode: c.ccn3 && c.ccn3.length > 0 ? c.ccn3 : null,
    country: {
      'pt-BR': countryPt,
      en: c.name.common,
    },
    nationality: {
      'pt-BR': { male, female },
    },
    flag: c.flag,
    region: c.region,
    subregion: c.subregion,
    independent: c.independent,
    unMember: c.unMember,
  };

  if (!male || !female) record.needsReview = true;
  return record;
}

async function main(): Promise<void> {
  const upstream = await readJson<UpstreamCountry[]>('data/upstream/countries.json');
  const source = await readJson<{ repository: string; ref: string }>('data/upstream/source.json');
  const overridesRaw = await readJson<Record<string, PtBrOverride>>('data/pt-BR.json');

  const overrides = new Map<string, PtBrOverride>(
    Object.entries(overridesRaw).filter(([key]) => !key.startsWith('__')),
  );

  const knownCodes = new Set(upstream.map((c) => c.cca2));
  const unknownOverrides = [...overrides.keys()].filter((code) => !knownCodes.has(code));
  if (unknownOverrides.length > 0) {
    process.stderr.write(
      `AVISO: overrides para códigos inexistentes no upstream: ${unknownOverrides.join(', ')}\n`,
    );
  }

  const data: Nationality[] = upstream
    .map((c) => buildRecord(c, overrides.get(c.cca2)))
    .sort((a, b) => a.code.localeCompare(b.code));

  const hash = createHash('sha256').update(JSON.stringify(data)).digest('hex');
  const unreviewed = data.filter((r) => r.needsReview).length;

  const dataset: Dataset = {
    meta: {
      total: data.length,
      version: new Date().toISOString().slice(0, 10),
      hash,
      source: { repository: source.repository, ref: source.ref },
      unreviewed,
    },
    data,
  };

  const serialized = `${JSON.stringify(dataset, null, 2)}\n`;
  await writeFile(resolve(ROOT, 'data/nationalities.json'), serialized);

  await mkdir(resolve(ROOT, 'public/v1'), { recursive: true });
  await writeFile(resolve(ROOT, 'public/v1/nationalities.json'), serialized);

  const headers = [
    '/v1/nationalities.json',
    '  Cache-Control: public, max-age=86400, stale-while-revalidate=604800',
    '  Cloudflare-CDN-Cache-Control: public, max-age=2592000',
    '  Access-Control-Allow-Origin: *',
    '  Access-Control-Allow-Methods: GET, HEAD, OPTIONS',
    `  X-Dataset-Version: ${dataset.meta.version}`,
    '',
  ].join('\n');
  await writeFile(resolve(ROOT, 'public/_headers'), headers);

  process.stdout.write(
    `OK: ${data.length} registros | curados: ${data.length - unreviewed} | ` +
      `needs_review: ${unreviewed} | version: ${dataset.meta.version} | hash: ${hash.slice(0, 12)}\n`,
  );
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
