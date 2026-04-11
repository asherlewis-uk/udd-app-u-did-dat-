import express, { Router } from 'express';
import helmet from 'helmet';
import { correlationIdMiddleware, mountHealthRoutes, createLogger } from '@udd/observability';
import { PgWorkerCapacityRepository } from '@udd/database';
import type { WorkerCapacitySnapshot } from '@udd/contracts';

const logger = createLogger('worker-manager');
const capacity = new PgWorkerCapacityRepository();

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(correlationIdMiddleware);

  const healthRouter = Router();
  mountHealthRoutes(healthRouter);
  app.use(healthRouter);

  // Worker capacity snapshot ingestion (internal, no auth — mTLS in prod)
  app.post('/internal/capacity-snapshot', async (req, res) => {
    const body = req.body as Partial<WorkerCapacitySnapshot>;

    if (
      typeof body.workerHost !== 'string' ||
      typeof body.totalSlots !== 'number' ||
      typeof body.usedSlots !== 'number' ||
      !Array.isArray(body.availablePorts) ||
      typeof body.healthy !== 'boolean'
    ) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Invalid snapshot payload' });
    }

    const snapshot: WorkerCapacitySnapshot = {
      workerHost: body.workerHost,
      totalSlots: body.totalSlots,
      usedSlots: body.usedSlots,
      availablePorts: body.availablePorts as number[],
      reportedAt: new Date().toISOString(),
      healthy: body.healthy,
    };

    try {
      await capacity.upsertSnapshot(snapshot);
      logger.info('Capacity snapshot upserted', { workerHost: snapshot.workerHost });
      return res.status(204).end();
    } catch (err) {
      logger.error('Failed to upsert capacity snapshot', { err });
      return res.status(500).json({ code: 'INTERNAL_ERROR', message: 'Failed to store snapshot' });
    }
  });

  return app;
}
