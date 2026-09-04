# nationalities

API pública, estática e agressivamente cacheável de **países, códigos ISO e
nacionalidades/gentílicos em português do Brasil**.

Feita para resolver a nacionalidade de um país, buscar país por código ISO e
consumir o dataset inteiro como JSON estático.

- **Stack:** TypeScript · Cloudflare Workers · Hono · Wrangler · Vitest
- **Sem** banco, Redis, filas ou serviços externos em runtime. 100% stateless.
- **Fonte de verdade:** o dataset. A API REST e o JSON estático são apenas
  interfaces para o mesmo dado.

> **Dados ≠ código.** O código é MIT; o dataset é derivado de
> [`mledoze/countries`](https://github.com/mledoze/countries) e é distribuído sob
> **ODbL v1.0**. Ver [`DATA_LICENSE.md`](./DATA_LICENSE.md) e
> [`DATA_SOURCES.md`](./DATA_SOURCES.md).

## Exemplos de uso

```bash
# listar todas as nacionalidades
curl https://api.example.com/v1/nationalities

# uma nacionalidade (aceita lowercase)
curl https://api.example.com/v1/nationalities/BR

# busca (case- e accent-insensitive)
curl "https://api.example.com/v1/nationalities?search=japao"

# lista simplificada de países
curl https://api.example.com/v1/countries
```

```ts
// dataset completo — via Static Assets, não invoca o Worker
const { data } = await fetch('https://api.example.com/v1/nationalities.json').then((r) => r.json());

const options = data.map((n) => ({
  value: n.code,
  label: n.nationality['pt-BR'].male,
}));
```

## Endpoints

| Método | Rota                      | Descrição                                             |
| ------ | ------------------------- | ----------------------------------------------------- |
| `GET`  | `/health`                 | `{ "status": "ok" }`                                  |
| `GET`  | `/v1/nationalities`       | Lista; aceita `?search=`                              |
| `GET`  | `/v1/nationalities/:code` | Um registro por ISO alpha-2 (aceita lowercase)        |
| `GET`  | `/v1/countries`           | Lista simplificada `{ code, iso3, name }`             |
| `GET`  | `/v1/countries/:code`     | Um país por ISO alpha-2 (aceita lowercase)            |
| `GET`  | `/v1/nationalities.json`  | Dataset completo, estático (Cloudflare Static Assets) |

Métodos aceitos: `GET`, `HEAD`, `OPTIONS`. Outros → `405`.

### Busca

`?search=` percorre nome do país (pt-BR e en), gentílico masculino, gentílico
feminino, ISO alpha-2 e ISO alpha-3. É _case-insensitive_ e _accent-insensitive_
(`japao` = `Japão` = `JAPÃO`). Limite de **100 caracteres** — acima disso, `400`.

### Formato de resposta

```jsonc
// GET /v1/nationalities/BR
{
  "data": {
    "code": "BR",
    "iso3": "BRA",
    "numericCode": "076",
    "country": { "pt-BR": "Brasil", "en": "Brazil" },
    "nationality": { "pt-BR": { "male": "brasileiro", "female": "brasileira" } },
    "flag": "🇧🇷",
    "region": "Americas",
    "subregion": "South America",
    "independent": true,
    "unMember": true,
  },
}
```

Listagens incluem `meta`:

```jsonc
{
  "data": [/* ... */],
  "meta": { "total": 250, "version": "2026-09-04" },
}
```

`version` é a data de geração do dataset — **não** a versão da aplicação.

Registros ainda sem gentílico curado trazem `"needsReview": true` (ver
[curadoria](#dataset-e-curadoria)). Filtre-os se precisar apenas de gentílicos
validados.

### Erros

```jsonc
{ "error": { "code": "NOT_FOUND", "message": "Nationality not found." } }
```

Códigos: `NOT_FOUND` (404), `INVALID_PARAMETER` (400),
`METHOD_NOT_ALLOWED` (405), `INTERNAL_ERROR` (500).

## Cache

Os dados mudam raríssimas vezes, então o cache é agressivo:

```http
Cache-Control: public, max-age=86400, stale-while-revalidate=604800
Cloudflare-CDN-Cache-Control: public, max-age=2592000
ETag: "<hash do dataset>"
```

- Navegador: 24 h · Edge da Cloudflare: 30 dias · `stale-while-revalidate`: 7 dias
- `ETag` deriva do hash do dataset; `If-None-Match` correspondente → `304`.
- `/health` usa `max-age=60`.

## CORS

API pública: `Access-Control-Allow-Origin: *` para `GET`, `HEAD`, `OPTIONS`.
Não há endpoints mutáveis.

## Rate limiting recomendado (Cloudflare WAF)

Não há rate limiting no código — configure na borda:

| Campo  | Valor              |
| ------ | ------------------ |
| Path   | `/v1/*`            |
| Limite | 30 requisições     |
| Janela | 10 segundos        |
| Chave  | IP                 |
| Ação   | Block (temporário) |

## Dataset e curadoria

- `data/upstream/countries.json` — cópia fixada de `mledoze/countries` (não editar).
- `data/pt-BR.json` — **camada editorial brasileira** (nomes e gentílicos pt-BR).
  Único arquivo de dados editável à mão.
- `data/nationalities.json` — **gerado** por `npm run build:data`.
- `public/v1/nationalities.json` — cópia servida como asset estático.

O commit fixado do upstream não traz gentílicos em português. Na v0.1.0 há um
**núcleo curado à mão** das nacionalidades mais comuns; os demais registros vêm
com `male`/`female` vazios e `needsReview: true`. `meta.unreviewed` conta quantos
faltam. Contribuições de curadoria são bem-vindas — ver
[`CONTRIBUTING.md`](./CONTRIBUTING.md) e [`DATA_SOURCES.md`](./DATA_SOURCES.md).

### Pipeline de dados

```bash
npm run sync:countries   # baixa mledoze/countries no SHA fixado -> data/upstream/
npm run build:data       # upstream + data/pt-BR.json -> data/nationalities.json + public/
npm run validate:data    # valida; exit != 0 quebra o CI
npm test
```

## Desenvolvimento local

```bash
nvm use            # Node 22 (.nvmrc)
npm install
npm run dev        # http://localhost:8787

curl http://localhost:8787/v1/nationalities
```

Scripts:

| Script                            | Ação                  |
| --------------------------------- | --------------------- |
| `npm run dev`                     | `wrangler dev`        |
| `npm run deploy`                  | `wrangler deploy`     |
| `npm test` / `npm run test:watch` | Vitest                |
| `npm run lint`                    | ESLint                |
| `npm run format`                  | Prettier              |
| `npm run typecheck`               | `tsc` (app + scripts) |
| `npm run sync:countries`          | baixa o upstream      |
| `npm run build:data`              | gera o dataset        |
| `npm run validate:data`           | valida o dataset      |

## Deployment

Deploy é feito pelo GitHub Actions **apenas quando o release-please publica um
release**:

1. Commits em `main` seguindo Conventional Commits.
2. `release-please` mantém um PR de release aberto com o CHANGELOG e o bump de versão.
3. Ao **mergear** esse PR, uma tag `vX.Y.Z` é criada e o job `deploy` roda
   `wrangler deploy` (após `validate:data` + `test`).

A versão inicial é `v0.1.0`. Após o primeiro release, remova `"release-as": "0.1.0"`
de `release-please-config.json`.

### Secrets necessários (repositório → Settings → Secrets → Actions)

| Secret                  | Descrição                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | Token com permissão _Workers Scripts:Edit_ (+ _Workers R2_/_Account: Workers KV_ não são necessários) |
| `CLOUDFLARE_ACCOUNT_ID` | ID da conta Cloudflare                                                                                |

Nenhum token é hardcoded.

### Passos manuais no Cloudflare Dashboard

1. **Conta/Worker:** criar o Worker `nationalities` (o primeiro `wrangler deploy`
   já cria). Gerar o API Token e anotar o Account ID → salvar como secrets.
2. **Domínio:** _Workers & Pages → nationalities → Settings → Domains & Routes_ →
   adicionar o custom domain (ex.: `api.example.com`).
3. **Cache:** os headers já vêm da aplicação e de `public/_headers`. Opcional:
   habilitar _Tiered Cache_. Não criar Page Rules que sobrescrevam `Cache-Control`.
4. **Rate limiting:** _Security → WAF → Rate limiting rules_ → criar a regra da
   tabela acima (`/v1/*`, 30 req / 10 s, por IP, block).
5. **Static Assets:** já configurado via `wrangler.jsonc` (`assets.directory =
./public`); `/v1/nationalities.json` é servido sem invocar o Worker.

## Licença

- **Código:** [MIT](./LICENSE)
- **Dataset:** [ODbL v1.0](./DATA_LICENSE.md) — derivado de `mledoze/countries`,
  com camada editorial pt-BR própria. Proveniência em [`DATA_SOURCES.md`](./DATA_SOURCES.md).
