import express, { Router } from 'express';
import helmet from 'helmet';
import { correlationIdMiddleware, mountHealthRoutes, createLogger } from '@udd/observability';

const logger = createLogger('worker-manager');

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
    logger.info('Capacity snapshot received', { workerHost: req.body?.workerHost });
    res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Phase 2' });
  });

  // Worker selection (called by orchestrator)
  app.post('/internal/select-worker', async (req, res) => {
    res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Phase 2' });
  });

  return app;
}
