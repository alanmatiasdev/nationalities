# Fontes de dados e proveniência

O dataset (`data/nationalities.json` e `public/v1/nationalities.json`) é um
**artefato gerado** por `npm run build:data`, combinando duas camadas:

```
mledoze/countries  ──►  normalização  ──┐
                                        ├──►  data/nationalities.json
data/pt-BR.json (camada editorial BR) ──┘
```

Nenhum arquivo em `data/` é editado à mão, **exceto `data/pt-BR.json`**.

## 1. `mledoze/countries` (fonte primária — dados estruturados)

- Repositório: <https://github.com/mledoze/countries>
- Licença: **ODbL v1.0**
- Versão fixada (commit SHA): `c8015eebdd94c533358406b0d709f441389e1f2e`
- Última sincronização: `2026-09-04` (ver `data/upstream/source.json`)
- Como atualizar: editar `UPSTREAM_REF` em `scripts/sync-countries.ts`, rodar
  `npm run sync:countries && npm run build:data && npm run validate:data && npm test`.

### Campos consumidos e mapeamento

| Campo upstream            | Campo no dataset | Observação                                                     |
| ------------------------- | ---------------- | -------------------------------------------------------------- |
| `cca2`                    | `code`           | Identificador canônico (ISO 3166-1 alpha-2)                    |
| `cca3`                    | `iso3`           | ISO 3166-1 alpha-3                                             |
| `ccn3`                    | `numericCode`    | ISO 3166-1 numérico; `null` quando ausente (ex.: Kosovo)       |
| `name.common`             | `country.en`     | Nome comum em inglês                                           |
| `translations.por.common` | `country.pt-BR`  | **Fallback** — sobrescrito por `data/pt-BR.json` quando houver |
| `flag`                    | `flag`           | Emoji da bandeira                                              |
| `region`                  | `region`         |                                                                |
| `subregion`               | `subregion`      |                                                                |
| `independent`             | `independent`    | `boolean \| null`                                              |
| `unMember`                | `unMember`       | `boolean`                                                      |

`name.official`, `translations.por.official`, `status` são lidos do upstream mas
não expostos no dataset atual.

## 2. Camada editorial brasileira — `data/pt-BR.json`

Contém os dados **específicos ou sobrescritos** para português do Brasil:
nome do país em pt-BR e os gentílicos (`nationality.pt-BR.male` / `.female`).
Prevalece sobre `translations.por.common` do upstream.

- Fontes de referência pretendidas: **FUNAG**, **Ministério das Relações
  Exteriores (Itamaraty)**, **IBGE**.
- O `mledoze/countries` **não** é fonte autoritativa para gentílicos em pt-BR
  (só traz `demonyms.eng` e `demonyms.fra`).

### Estado da curadoria (v0.1.0)

O commit fixado do upstream não fornece gentílicos em português. Portanto:

- **Nomes de país em pt-BR:** cobertura total (upstream + overrides editoriais).
- **Gentílicos:** um **núcleo curado à mão** (as nacionalidades mais usadas em
  formulários) está completo em `data/pt-BR.json`. Os demais registros são
  gerados com `male`/`female` vazios e marcados com `needsReview: true`.
- `meta.unreviewed` no dataset informa quantos registros ainda aguardam curadoria.
- `npm run validate:data` **falha** em erros estruturais (ISO ausente, nome pt-BR
  ausente, código duplicado, override órfão, contagem anômala) e apenas **avisa**
  sobre `needsReview`.

Concluir a curadoria dos gentílicos (com citação de fonte por país) é trabalho
editorial contínuo, feito via Pull Request editando `data/pt-BR.json`.

## 3. Transformações aplicadas no build

- Filtragem das chaves `__meta`/`__*` de `data/pt-BR.json`.
- Ordenação dos registros por `code` (ISO alpha-2).
- `numericCode` normalizado para `null` quando vazio.
- `trim()` em nomes e gentílicos vindos dos overrides.
- Cálculo de `meta.hash` = `sha256(JSON.stringify(data))` — usado como ETag da API.
- `meta.version` = data do build (`YYYY-MM-DD`).
- `meta.source` = `{ repository, ref }` de `data/upstream/source.json` (reprodutibilidade).

## 4. Overrides manuais

Todos os overrides vivem em `data/pt-BR.json` (nenhuma edição manual em outros
arquivos de `data/`). Cada chave é um código ISO alpha-2 que **deve** existir no
upstream — `validate:data` falha caso contrário.
