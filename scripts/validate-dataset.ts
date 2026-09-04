/**
 * Valida o dataset gerado (data/nationalities.json) e a camada editorial (data/pt-BR.json).
 *
 *   npm run validate:data
 *
 * Erros (exit 1, quebram o CI):
 *   - código ISO alpha-2 ausente
 *   - código ISO alpha-3 ausente
 *   - códigos duplicados
 *   - registros duplicados
 *   - nome pt-BR ausente
 *   - override em data/pt-BR.json para código inexistente no upstream
 *   - contagem total fora da faixa sã ou divergente do upstream
 *   - estrutura de registro inválida
 *
 * Avisos (exit 0): gentílicos pendentes de curadoria (needsReview). Resolver os
 * gentílicos é trabalho editorial contínuo e não bloqueia releases — ver DATA_SOURCES.md.
 */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { isNationality, type Dataset } from '../src/schemas/nationality';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const readJson = async <T>(rel: string): Promise<T> =>
  JSON.parse(await readFile(resolve(ROOT, rel), 'utf8')) as T;

const COUNT_MIN = 240;
const COUNT_MAX = 260;

async function main(): Promise<void> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const dataset = await readJson<Dataset>('data/nationalities.json');
  const upstream = await readJson<Array<{ cca2: string }>>('data/upstream/countries.json');
  const overridesRaw = await readJson<Record<string, unknown>>('data/pt-BR.json');

  const { data, meta } = dataset;
  const knownCodes = new Set(upstream.map((c) => c.cca2));

  // Contagem
  if (data.length < COUNT_MIN || data.length > COUNT_MAX) {
    errors.push(
      `Contagem inesperada de países: ${data.length} (esperado entre ${COUNT_MIN} e ${COUNT_MAX}). ` +
        `Revise as mudanças upstream antes de publicar.`,
    );
  }
  if (data.length !== upstream.length) {
    errors.push(`Divergência de contagem: dataset=${data.length}, upstream=${upstream.length}.`);
  }
  if (meta.total !== data.length) {
    errors.push(`meta.total (${meta.total}) != data.length (${data.length}).`);
  }

  // Registros
  const seenCodes = new Set<string>();
  const seenSerialized = new Set<string>();
  for (const [i, record] of data.entries()) {
    const label = record?.code ? `[${record.code}]` : `[índice ${i}]`;

    if (!isNationality(record)) {
      errors.push(`${label} estrutura de registro inválida.`);
      continue;
    }
    if (!record.code) errors.push(`${label} ISO alpha-2 ausente.`);
    if (!record.iso3) errors.push(`${label} ISO alpha-3 ausente.`);
    if (!/^[A-Z]{2}$/.test(record.code)) errors.push(`${label} ISO alpha-2 fora do formato.`);
    if (!/^[A-Z]{3}$/.test(record.iso3)) errors.push(`${label} ISO alpha-3 fora do formato.`);
    if (!record.country['pt-BR']) errors.push(`${label} nome pt-BR ausente.`);
    if (!knownCodes.has(record.code)) {
      errors.push(`${label} não corresponde a um código ISO conhecido no upstream.`);
    }

    if (seenCodes.has(record.code)) errors.push(`${label} código duplicado.`);
    seenCodes.add(record.code);

    const serialized = JSON.stringify(record);
    if (seenSerialized.has(serialized)) errors.push(`${label} registro duplicado.`);
    seenSerialized.add(serialized);

    const { male, female } = record.nationality['pt-BR'];
    if (!male || !female) {
      warnings.push(`${label} ${record.country['pt-BR']}: gentílico pendente de curadoria.`);
    }
  }

  // Overrides
  for (const key of Object.keys(overridesRaw)) {
    if (key.startsWith('__')) continue;
    if (!knownCodes.has(key)) {
      errors.push(`Override para código inexistente no upstream: ${key}.`);
    }
  }

  // Relatório
  if (warnings.length > 0) {
    process.stdout.write(`\n${warnings.length} aviso(s) — gentílicos pendentes:\n`);
    for (const w of warnings) process.stdout.write(`  - ${w}\n`);
  }

  if (errors.length > 0) {
    process.stderr.write(`\n${errors.length} erro(s):\n`);
    for (const e of errors) process.stderr.write(`  ✗ ${e}\n`);
    process.stderr.write('\nvalidate:data FALHOU\n');
    process.exit(1);
  }

  process.stdout.write(
    `\nvalidate:data OK — ${data.length} registros, ${data.length - dataset.meta.unreviewed} curados, ` +
      `${dataset.meta.unreviewed} pendentes.\n`,
  );
}

main().catch((err: unknown) => {
  process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
