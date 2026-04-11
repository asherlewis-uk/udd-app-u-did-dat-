import express from 'express';
import helmet from 'helmet';
import { Router } from 'express';
import { correlationIdMiddleware, mountHealthRoutes } from '@udd/observability';
import { errorMiddleware, notFoundMiddleware } from './middleware/error.js';
import apiRouter from './routes/index.js';

export function createApp(): express.Application {
  const app = express();

  // Security headers
  app.use(helmet());

  // Request body parsing
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Correlation ID injection (must be early)
  app.use(correlationIdMiddleware);

  // Health endpoints (no auth)
  const healthRouter = Router();
  mountHealthRoutes(healthRouter);
  app.use(healthRouter);

  // API routes
  app.use('/v1', apiRouter);

  // 404 handler
  app.use(notFoundMiddleware);

  // Error handler (must be last)
  app.use(errorMiddleware);

  return app;
}
