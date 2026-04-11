import express, { Router } from 'express';
import helmet from 'helmet';
import { correlationIdMiddleware, mountHealthRoutes } from '@udd/observability';
import providerRoutes from './routes/providers.js';
import roleRoutes from './routes/roles.js';
import pipelineRoutes from './routes/pipelines.js';
import runRoutes from './routes/runs.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '2mb' }));
  app.use(correlationIdMiddleware);
  const healthRouter = Router();
  mountHealthRoutes(healthRouter);
  app.use(healthRouter);
  app.use('/v1', providerRoutes);
  app.use('/v1', roleRoutes);
  app.use('/v1', pipelineRoutes);
  app.use('/v1', runRoutes);
  return app;
}
