# Licença dos dados

O **código** deste projeto é MIT (ver `LICENSE`). O **dataset** tem licença própria,
descrita aqui.

## Resumo

| Item                                                                                           | Licença                               |
| ---------------------------------------------------------------------------------------------- | ------------------------------------- |
| Código-fonte (`src/`, `scripts/`, configs)                                                     | MIT                                   |
| Dataset derivado (`data/nationalities.json`, `public/v1/nationalities.json`, respostas da API) | **ODbL v1.0**                         |
| Conteúdos individuais do dataset (textos de nomes/gentílicos)                                  | Database Contents License (DbCL) v1.0 |

## Por quê

A fonte primária de dados estruturados sobre países é o projeto
[`mledoze/countries`](https://github.com/mledoze/countries), licenciado sob a
**Open Database License (ODbL) v1.0**. A ODbL é _share-alike_: um banco de dados
derivado que é distribuído publicamente deve ser licenciado sob a ODbL e deve
atribuir a fonte original.

Como este projeto combina `mledoze/countries` com uma camada editorial própria
(`data/pt-BR.json`) para produzir um banco público derivado (`data/nationalities.json`),
esse banco derivado é distribuído sob a **ODbL v1.0**.

## Suas obrigações ao usar o dataset

1. **Atribuição** — credite `mledoze/countries` e este projeto.
2. **Share-alike** — se você distribuir publicamente uma versão adaptada do
   banco de dados, licencie-a sob a ODbL.
3. **Keep open** — se você distribuir o banco (ou um derivado) com medidas
   técnicas que restrinjam o acesso, também deve disponibilizar uma versão sem
   essas restrições.

O uso do dataset apenas para _produzir e distribuir um trabalho_ (ex.: popular um
`<select>` em uma aplicação, exibir gentílicos numa tela) **não** dispara o
share-alike — apenas a redistribuição do próprio banco de dados dispara.

## Texto das licenças

- ODbL v1.0: <https://opendatacommons.org/licenses/odbl/1-0/>
- DbCL v1.0: <https://opendatacommons.org/licenses/dbcl/1-0/>

Ver `DATA_SOURCES.md` para a proveniência campo a campo.
