import type { Context } from 'hono';

/** Códigos de erro estáveis expostos na resposta. */
export type ErrorCode = 'NOT_FOUND' | 'INVALID_PARAMETER' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR';

type ErrorStatus = 400 | 404 | 405 | 500;

export interface ErrorBody {
  error: {
    code: ErrorCode;
    message: string;
  };
}

/** Formato de erro consistente em toda a API. */
export function errorResponse(c: Context, status: ErrorStatus, code: ErrorCode, message: string) {
  return c.json<ErrorBody>({ error: { code, message } }, status);
}

export function notFound(c: Context, message = 'Resource not found.') {
  return errorResponse(c, 404, 'NOT_FOUND', message);
}
