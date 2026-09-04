/**
 * Modelo de dados canônico da aplicação.
 *
 * O identificador canônico é o código ISO 3166-1 alpha-2 (`code`).
 * Nomes traduzidos nunca são usados como identificadores.
 */
export interface Nationality {
  /** ISO 3166-1 alpha-2, ex.: "BR". Identificador canônico. */
  code: string;
  /** ISO 3166-1 alpha-3, ex.: "BRA". */
  iso3: string;
  /** ISO 3166-1 numérico, ex.: "076". `null` quando o upstream não define (ex.: Kosovo). */
  numericCode: string | null;

  country: {
    'pt-BR': string;
    en: string;
  };

  nationality: {
    'pt-BR': {
      male: string;
      female: string;
    };
  };

  /** Emoji da bandeira, proveniente do upstream. */
  flag: string;
  region: string;
  subregion: string;
  /** `null` para alguns territórios (ex.: Antártida). */
  independent: boolean | null;
  unMember: boolean;

  /**
   * Presente e `true` quando os gentílicos ainda não passaram por curadoria
   * editorial brasileira (FUNAG/Itamaraty). Consumidores podem filtrar por isto.
   * Ausente quando o registro está curado.
   */
  needsReview?: true;
}

/** Representação simplificada usada em `GET /v1/countries`. */
export interface CountrySummary {
  code: string;
  iso3: string;
  name: string;
}

export interface DatasetMeta {
  total: number;
  /** Data do build (YYYY-MM-DD) — versão do dataset, independente da versão do app. */
  version: string;
  /** sha256 do array `data`, usado para ETag. */
  hash: string;
  source: {
    repository: string;
    ref: string;
  };
  /** Quantidade de registros com `needsReview`. */
  unreviewed: number;
}

export interface Dataset {
  meta: DatasetMeta;
  data: Nationality[];
}

const isNonEmptyString = (v: unknown): v is string => typeof v === 'string' && v.length > 0;

/** Validação estrutural mínima de um registro (usada por scripts e testes). */
export function isNationality(value: unknown): value is Nationality {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  const country = v.country as Record<string, unknown> | undefined;
  const nat = v.nationality as Record<string, unknown> | undefined;
  const natPt = nat?.['pt-BR'] as Record<string, unknown> | undefined;

  return (
    isNonEmptyString(v.code) &&
    isNonEmptyString(v.iso3) &&
    typeof country === 'object' &&
    country !== null &&
    isNonEmptyString(country['pt-BR']) &&
    isNonEmptyString(country.en) &&
    typeof natPt === 'object' &&
    natPt !== null &&
    typeof natPt.male === 'string' &&
    typeof natPt.female === 'string'
  );
}
