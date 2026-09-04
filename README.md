# Nationalities API

API pública, gratuita e agressivamente cacheável de **países, códigos ISO e
nacionalidades/gentílicos em português do Brasil**.

Use para popular um `<select>` de nacionalidades, resolver a nacionalidade de um
país, buscar país por código ISO ou consumir o dataset inteiro como um único JSON.

```
Base URL:  https://data.enyx.com.br
```

Somente leitura (`GET`, `HEAD`, `OPTIONS`), `CORS: *`, sem autenticação, sem chave
de API. Toda a API vive sob `/v1`.

## Início rápido

```bash
# lista completa de nacionalidades
curl https://data.enyx.com.br/v1/nationalities

# uma nacionalidade pelo código ISO 3166-1 alpha-2 (aceita minúsculo)
curl https://data.enyx.com.br/v1/nationalities/BR

# busca (case- e accent-insensitive)
curl "https://data.enyx.com.br/v1/nationalities?search=japao"
```

```ts
// popular um <select> — baixe o dataset inteiro de uma vez
const res = await fetch('https://data.enyx.com.br/v1/nationalities.json');
const { data } = await res.json();

const options = data.map((n) => ({
  value: n.code, // "BR"
  label: n.nationality['pt-BR'].male, // "brasileiro"
}));
```

## Endpoints

Todas as respostas são JSON. O recurso pedido vem em `data`; listagens trazem
também `meta`.

| Método | Rota                      | Descrição                                                |
| ------ | ------------------------- | -------------------------------------------------------- |
| `GET`  | `/health`                 | `{ "status": "ok" }` — status do serviço                 |
| `GET`  | `/v1/nationalities`       | Lista todas as nacionalidades. Aceita `?search=`         |
| `GET`  | `/v1/nationalities/:code` | Uma nacionalidade pelo ISO alpha-2 (aceita minúsculo)    |
| `GET`  | `/v1/countries`           | Lista simplificada de países `{ code, iso3, name }`      |
| `GET`  | `/v1/countries/:code`     | Um país pelo ISO alpha-2 (aceita minúsculo)              |
| `GET`  | `/v1/nationalities.json`  | Dataset completo (`meta` + `data`) como arquivo estático |

**Para carregar o dataset inteiro use `/v1/nationalities.json`** — é servido do
edge da Cloudflare como arquivo estático (não passa pelo Worker) e é o caminho
mais rápido e barato para consumidores que precisam de tudo.

### Parâmetro `search`

`GET /v1/nationalities?search=<termo>` filtra por:

- nome do país em pt-BR e em inglês;
- gentílico masculino e feminino;
- ISO alpha-2 e ISO alpha-3.

A busca é **case-insensitive** e **accent-insensitive** — `japao`, `Japão` e
`JAPÃO` retornam o mesmo. Máximo de **100 caracteres** (acima disso, `400`).

## Modelo de dados

```jsonc
// GET /v1/nationalities/BR
{
  "data": {
    "code": "BR", // ISO 3166-1 alpha-2 — identificador canônico
    "iso3": "BRA", // ISO 3166-1 alpha-3
    "numericCode": "076", // ISO 3166-1 numérico (pode ser null)
    "country": { "pt-BR": "Brasil", "en": "Brazil" },
    "nationality": { "pt-BR": { "male": "brasileiro", "female": "brasileira" } },
    "flag": "🇧🇷",
    "region": "Americas",
    "subregion": "South America",
    "independent": true, // pode ser null p/ alguns territórios
    "unMember": true,
  },
}
```

Listagens:

```jsonc
{
  "data": [/* ... */],
  "meta": {
    "total": 250, // itens retornados (respeita o filtro de busca)
    "version": "2026-09-04", // data de geração do dataset
  },
}
```

`meta.version` reflete o dataset, **não** a versão do serviço.

`GET /v1/countries` devolve a forma reduzida:

```jsonc
{
  "data": [{ "code": "BR", "iso3": "BRA", "name": "Brasil" }],
  "meta": { "total": 250, "version": "2026-09-04" },
}
```

### Estado da curadoria dos gentílicos

Os nomes de país em pt-BR têm cobertura total. Os **gentílicos** ainda estão em
curadoria editorial (fontes: FUNAG, Itamaraty, IBGE): os registros já revisados
têm `male`/`female` preenchidos; os pendentes vêm com esses campos **vazios** e um
campo extra `"needsReview": true`. O dataset estático traz `meta.unreviewed` com a
contagem de pendentes.

Se você só precisa de gentílicos validados, filtre `needsReview`:

```ts
const usaveis = data.filter((n) => !n.needsReview);
```

## Erros

Formato consistente, com `code` estável:

```jsonc
{ "error": { "code": "NOT_FOUND", "message": "Nationality not found." } }
```

| HTTP  | `code`               | Quando                                         |
| ----- | -------------------- | ---------------------------------------------- |
| `400` | `INVALID_PARAMETER`  | `search` acima de 100 caracteres               |
| `404` | `NOT_FOUND`          | código ISO inexistente / rota desconhecida     |
| `405` | `METHOD_NOT_ALLOWED` | método diferente de `GET` / `HEAD` / `OPTIONS` |
| `500` | `INTERNAL_ERROR`     | erro inesperado                                |

## Cache e requisições condicionais

Os dados mudam raríssimas vezes; trate as respostas como altamente cacheáveis.

```http
Cache-Control: public, max-age=86400, stale-while-revalidate=604800
ETag: "<hash do dataset>"
```

- **Navegador:** 24 h · **edge da Cloudflare:** 30 dias · **stale-while-revalidate:** 7 dias.
- O `ETag` deriva do hash do dataset — só muda quando os dados mudam.
- Envie `If-None-Match: "<etag>"` e a API responde **`304 Not Modified`** sem corpo
  quando nada mudou.
- `/health` usa `max-age=60`.

## CORS

Liberado para qualquer origem: `Access-Control-Allow-Origin: *` em
`GET`, `HEAD`, `OPTIONS`. Não há endpoints que alterem estado.

## Limites de uso

A API é protegida por rate limiting no edge da Cloudflare (aproximadamente
**30 requisições / 10 s por IP** em `/v1/*`; excedentes recebem bloqueio temporário).
Para consumir o dataset inteiro, baixe **`/v1/nationalities.json`** uma vez e
cacheie do seu lado — não itere item a item.

## Dados, fontes e licença

O **dataset** é um banco de dados derivado e tem licença **própria**, separada do
código:

|                                                       | Licença                            |
| ----------------------------------------------------- | ---------------------------------- |
| Código deste repositório                              | [MIT](./LICENSE)                   |
| Dataset (respostas da API e `/v1/nationalities.json`) | **[ODbL v1.0](./DATA_LICENSE.md)** |

Fonte primária de dados estruturados sobre países:
[`mledoze/countries`](https://github.com/mledoze/countries) (ODbL). A camada
editorial de nomes e gentílicos em pt-BR é própria deste projeto. Proveniência
campo a campo em [`DATA_SOURCES.md`](./DATA_SOURCES.md).

**Ao redistribuir o dataset** (ou um derivado dele), você precisa creditar
`mledoze/countries` e a Nationalities API e manter a licença ODbL. Apenas
_consumir_ a API para exibir dados em uma aplicação não dispara o share-alike —
veja [`DATA_LICENSE.md`](./DATA_LICENSE.md).

## Status

`GET /health` → `200 { "status": "ok" }`.

## Contribuindo e operação

Este repositório contém o código do Worker e o pipeline de dados.

- Correções de dados (nomes/gentílicos pt-BR), setup local e padrão de commits:
  [`CONTRIBUTING.md`](./CONTRIBUTING.md).
- Deploy, release automatizado e configuração da Cloudflare:
  [`OPERATIONS.md`](./OPERATIONS.md).
