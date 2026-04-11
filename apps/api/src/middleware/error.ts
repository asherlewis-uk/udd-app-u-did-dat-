import type { Request, Response, NextFunction } from 'express';
import { createLogger } from '@udd/observability';

const logger = createLogger('api');

// ============================================================
// Standardized error envelope middleware
// Must be the last middleware registered.
// ============================================================

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: unknown[];
}

export function errorMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? (statusCode === 404 ? 'NOT_FOUND' : 'INTERNAL_ERROR');

  if (statusCode >= 500) {
    const logCtx: Record<string, unknown> = {
      err,
      path: req.path,
      method: req.method,
    };
    if (req.correlationId !== undefined) logCtx['correlationId'] = req.correlationId;
    logger.error('Unhandled error', logCtx);
  }

  res.status(statusCode).json({
    code,
    message: statusCode >= 500 ? 'An internal error occurred' : err.message,
    details: err.details,
    correlationId: req.correlationId ?? 'unknown',
  });
}

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    code: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    correlationId: req.correlationId ?? 'unknown',
  });
}

export function createAppError(
  message: string,
  statusCode: number,
  code: string,
  details?: unknown[],
): AppError {
  const err = new Error(message) as AppError;
  err.statusCode = statusCode;
  err.code = code;
  if (details !== undefined) err.details = details;
  return err;
}
