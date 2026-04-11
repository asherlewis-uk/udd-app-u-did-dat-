import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

// ============================================================
// Correlation ID propagation
// All inbound requests get a correlation ID injected.
// All outbound calls must propagate it in X-Correlation-ID header.
// ============================================================

export const CORRELATION_ID_HEADER = 'x-correlation-id';
export const CORRELATION_ID_RESPONSE_HEADER = 'x-correlation-id';

/**
 * Express middleware — reads or generates a correlation ID for every request.
 * Attaches to req.correlationId and echoes it in the response header.
 */
export function correlationIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const fromHeader = req.headers[CORRELATION_ID_HEADER];
  const correlationId = typeof fromHeader === 'string' && fromHeader.length > 0
    ? fromHeader
    : randomUUID();

  req.correlationId = correlationId;
  res.setHeader(CORRELATION_ID_RESPONSE_HEADER, correlationId);
  next();
}

/**
 * Build headers for outbound HTTP calls that propagate trace context.
 */
export function propagationHeaders(correlationId: string): Record<string, string> {
  return {
    [CORRELATION_ID_HEADER]: correlationId,
  };
}

// ============================================================
// Trace context — lightweight span concept for service calls
// In production, replace with OpenTelemetry SDK integration.
// ============================================================

export interface SpanContext {
  correlationId: string;
  spanId: string;
  parentSpanId?: string;
  service: string;
  operation: string;
  startTime: number;
}

export function startSpan(ctx: Omit<SpanContext, 'spanId' | 'startTime'>): SpanContext {
  return {
    ...ctx,
    spanId: randomUUID(),
    startTime: Date.now(),
  };
}

export function endSpan(
  span: SpanContext,
  result: 'ok' | 'error',
  logger?: { info: (msg: string, ctx: object) => void },
): void {
  const durationMs = Date.now() - span.startTime;
  logger?.info('span_end', {
    correlationId: span.correlationId,
    spanId: span.spanId,
    parentSpanId: span.parentSpanId,
    service: span.service,
    operation: span.operation,
    result,
    durationMs,
  });
}
