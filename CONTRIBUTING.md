# Contribuindo

## Setup

```bash
nvm use          # Node 22
npm install
npm run dev      # http://localhost:8787
```

## Antes de abrir um PR

```bash
npm run lint
npm run typecheck
npm run validate:data
npm test
```

O CI roda exatamente esses quatro passos.

## Conventional Commits (obrigatório)

Os releases são automatizados pelo [release-please](https://github.com/googleapis/release-please).
As mensagens de commit **precisam** seguir
[Conventional Commits](https://www.conventionalcommits.org/):

| Prefixo                               | Uso                                  | Entra no CHANGELOG |
| ------------------------------------- | ------------------------------------ | ------------------ |
| `feat:`                               | nova funcionalidade                  | Features           |
| `fix:`                                | correção de bug                      | Bug Fixes          |
| `data:`                               | mudança no dataset / curadoria pt-BR | Dataset            |
| `perf:`                               | performance                          | Performance        |
| `docs:`                               | documentação                         | Documentation      |
| `deps:`                               | dependências                         | Dependencies       |
| `refactor:`, `test:`, `chore:`, `ci:` | manutenção                           | oculto             |

`feat!:` ou um rodapé `BREAKING CHANGE:` sinaliza mudança incompatível.
Enquanto a versão for `0.x`, `feat` incrementa o patch e breaking changes
incrementam o minor.

O deploy é automático ao mergear o PR de release — detalhes em
[`OPERATIONS.md`](./OPERATIONS.md).

## Editando o dataset

- **Nunca** edite `data/nationalities.json`, `data/upstream/*` ou
  `public/v1/nationalities.json` à mão — são gerados.
- Para corrigir/adicionar um nome de país ou gentílico em pt-BR, edite
  `data/pt-BR.json` (chave = código ISO alpha-2) e rode:

  ```bash
  npm run build:data
  npm run validate:data
  npm test
  ```

  Commite `data/pt-BR.json`, `data/nationalities.json` e
  `public/v1/nationalities.json` juntos, com um commit `data: ...`.

- Ao curar um gentílico, cite a fonte (FUNAG/Itamaraty/IBGE) na descrição do PR.
- Para atualizar o upstream `mledoze/countries`, veja `DATA_SOURCES.md`.
