# Operação e deploy

Referência para mantenedores. Uso e consumo da API estão no [`README.md`](./README.md).

## Ambiente

- Cloudflare Workers (Free Tier), stateless.
- Worker: `nationalities`.
- Domínio público: `https://data.enyx.com.br`.
- `/v1/nationalities.json` é servido por Cloudflare Static Assets (`public/`), sem
  invocar o Worker.

## Fluxo de release e deploy

Deploy acontece **somente quando o release-please publica um release**:

1. Commits em `main` seguindo Conventional Commits (ver `CONTRIBUTING.md`).
2. O workflow `Release` mantém um PR de release aberto com `CHANGELOG.md` e o bump
   de versão em `package.json` / `package-lock.json`.
3. Ao **mergear** esse PR, a tag `vX.Y.Z` e a GitHub Release são criadas e o job
   `deploy` roda `npm run validate:data` + `npm test` + `wrangler deploy`.

Não há `npm publish` — a API não é distribuída como pacote.

### Versionamento

- A `v0.1.0` já foi cortada (tag `v0.1.0`). O `release-as` fixo foi removido do
  `release-please-config.json` — a partir daqui o release-please calcula a próxima
  versão a partir dos Conventional Commits.
- Enquanto a versão for `0.x`: `feat` incrementa patch; `feat!` / `BREAKING CHANGE`
  incrementa minor.

### Permissão para o release-please abrir o PR (uma vez)

_Repositório → Settings → Actions → General → Workflow permissions:_

- **Read and write permissions**
- marcar **Allow GitHub Actions to create and approve pull requests**

Sem isso o workflow falha em _"GitHub Actions is not permitted to create or approve
pull requests"_ (a branch e o commit são criados, mas o PR não).

Alternativa (ou se a organização proibir o checkbox): criar um **fine-grained PAT**
ou GitHub App com _Pull requests: write_ + _Contents: write_ e salvá-lo como secret
`RELEASE_PLEASE_TOKEN`. O workflow o usa automaticamente quando existe — e assim o
CI também roda no próprio PR de release.

## Secrets (Settings → Secrets and variables → Actions)

| Secret                  | Obrigatório | Descrição                                                                    |
| ----------------------- | ----------- | ---------------------------------------------------------------------------- |
| `CLOUDFLARE_API_TOKEN`  | sim         | Token com permissão _Workers Scripts: Edit_ (inclui upload de Static Assets) |
| `CLOUDFLARE_ACCOUNT_ID` | sim         | ID da conta Cloudflare                                                       |
| `RELEASE_PLEASE_TOKEN`  | opcional    | PAT/GitHub App para o release-please abrir o PR sem depender do checkbox     |

Nenhum token fica hardcoded.

## Configuração na Cloudflare

1. **Conta / Worker** — o primeiro `wrangler deploy` cria o Worker `nationalities`.
   Gere o API Token e anote o Account ID; salve-os como secrets.
2. **Domínio** — `wrangler.jsonc` já declara o custom domain
   `data.enyx.com.br` (`routes[].custom_domain`). A zona `enyx.com.br`
   precisa estar na mesma conta Cloudflare; o `wrangler deploy` provisiona o
   hostname e o certificado. Alternativa manual: _Workers & Pages → nationalities →
   Settings → Domains & Routes → Add custom domain_.
3. **Rate limiting** — _Security → WAF → Rate limiting rules_:

   | Campo  | Valor              |
   | ------ | ------------------ |
   | Path   | `/v1/*`            |
   | Limite | 30 requisições     |
   | Janela | 10 segundos        |
   | Chave  | IP                 |
   | Ação   | Block (temporário) |

4. **Cache** — os cabeçalhos vêm da aplicação e de `public/_headers`. Não criar
   Page Rules / Transform Rules que sobrescrevam `Cache-Control`. Opcional: ativar
   _Tiered Cache_.

## Deploy manual (fora do CI)

```bash
npx wrangler login
npm run deploy
```

## Dataset em produção

A produção usa **exclusivamente** os artefatos versionados (`data/nationalities.json`
e `public/v1/nationalities.json`). O CI de deploy só revalida (`validate:data`), não
reconstrói. Para atualizar os dados, veja `CONTRIBUTING.md` e `DATA_SOURCES.md` —
a mudança entra por PR e vai a produção no próximo release.
