import express, { Router } from 'express';
import helmet from 'helmet';
import { correlationIdMiddleware, mountHealthRoutes } from '@udd/observability';
import commentRoutes from './routes/comments.js';

export function createApp(): express.Application {
  const app = express();
  app.use(helmet());
  app.use(express.json({ limit: '1mb' }));
  app.use(correlationIdMiddleware);
  const healthRouter = Router();
  mountHealthRoutes(healthRouter);
  app.use(healthRouter);
  app.use('/v1', commentRoutes);
  return app;
}
