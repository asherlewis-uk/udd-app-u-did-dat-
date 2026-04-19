import type { Request, Response, Router } from 'express';

// ============================================================
// Health / readiness / liveness endpoint helpers
// Every service registers these at startup.
// ============================================================

export interface HealthCheck {
  name: string;
  check(): Promise<{ healthy: boolean; detail?: string }>;
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'unhealthy';
  uptime: number;
  timestamp: string;
  checks: Array<{
    name: string;
    healthy: boolean;
    detail?: string;
  }>;
}

const startTime = Date.now();
const registeredChecks: HealthCheck[] = [];

export function registerHealthCheck(check: HealthCheck): void {
  registeredChecks.push(check);
}

export async function runHealthChecks(): Promise<HealthStatus> {
  const results = await Promise.all(
    registeredChecks.map(async (c) => {
      try {
        const result = await c.check();
        return { name: c.name, ...result };
      } catch (err) {
        return {
          name: c.name,
          healthy: false,
          detail: err instanceof Error ? err.message : String(err),
        };
      }
    }),
  );

  const allHealthy = results.every((r) => r.healthy);
  const anyDegraded = results.some((r) => !r.healthy);

  return {
    status: allHealthy ? 'ok' : anyDegraded ? 'degraded' : 'unhealthy',
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks: results,
  };
}

/**
 * Mount /health, /ready, /alive on an Express router.
 *
 * GET /health — full health report (all checks)
 * GET /ready  — readiness probe (returns 503 if unhealthy)
 * GET /alive  — liveness probe (always 200 if process is up)
 */
export function mountHealthRoutes(router: Router): void {
  router.get('/alive', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'alive' });
  });

  router.get('/ready', async (_req: Request, res: Response) => {
    const health = await runHealthChecks();
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  router.get('/health', async (_req: Request, res: Response) => {
    const health = await runHealthChecks();
    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  // /healthz — lightweight probe used by the connectivity audit and Cloud Run
  router.get('/healthz', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
  });
}
