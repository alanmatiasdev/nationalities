/**
 * Baixa uma versão fixa (pinned) do dataset upstream `mledoze/countries`.
 *
 *   npm run sync:countries
 *
 * Nunca é executado em runtime da API. A aplicação em produção usa apenas os
 * arquivos versionados em `data/`.
 *
 * Para atualizar o upstream: altere UPSTREAM_REF para um novo commit SHA,
 * rode este script, depois `npm run build:data`, `npm run validate:data` e `npm test`.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const UPSTREAM_REPO = 'mledoze/countries';
/** Commit SHA fixo de github.com/mledoze/countries. */
const UPSTREAM_REF = 'c8015eebdd94c533358406b0d709f441389e1f2e';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = resolve(ROOT, 'data/upstream');

async function main(): Promise<void> {
  const url = `https://raw.githubusercontent.com/${UPSTREAM_REPO}/${UPSTREAM_REF}/countries.json`;
  process.stdout.write(`Baixando ${url}\n`);

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Falha ao baixar upstream: ${res.status} ${res.statusText}`);
  }

  const raw = (await res.json()) as unknown[];
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error('Payload upstream inválido: esperado um array não vazio.');
  }

  await mkdir(OUT_DIR, { recursive: true });
  await writeFile(resolve(OUT_DIR, 'countries.json'), `${JSON.stringify(raw, null, 2)}\n`);
  await writeFile(
    resolve(OUT_DIR, 'source.json'),
    `${JSON.stringify(
      {
        repository: UPSTREAM_REPO,
        ref: UPSTREAM_REF,
        url: `https://github.com/${UPSTREAM_REPO}/tree/${UPSTREAM_REF}`,
        license: 'ODbL-1.0',
        fetchedAt: new Date().toISOString(),
        count: raw.length,
      },
      null,
      2,
    )}\n`,
  );

  process.stdout.write(`OK: ${raw.length} países gravados em data/upstream/\n`);
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
