// ============================================================
// Express handler that serves Prometheus-format metrics at
// /metrics (or wherever the consumer mounts it).
// ============================================================

import { register } from 'prom-client';
import type { Request, Response } from 'express';

/**
 * Express request handler that returns all registered
 * prom-client metrics in Prometheus text exposition format.
 *
 * Usage:
 * ```ts
 * app.get('/metrics', metricsHandler);
 * ```
 */
export async function metricsHandler(_req: Request, res: Response): Promise<void> {
  res.set('Content-Type', register.contentType);
  const data = await register.metrics();
  res.end(data);
}
