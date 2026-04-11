import express, { Router } from 'express';
import helmet from 'helmet';
import { correlationIdMiddleware, mountHealthRoutes } from '@udd/observability';
import { authMiddleware } from '@udd/auth';
import { previewProxyMiddleware, type PreviewRouteRegistry } from './proxy.js';

export function createApp(registry: PreviewRouteRegistry): express.Application {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled — proxied apps set their own
  app.use(correlationIdMiddleware);

  // Health routes (no auth)
  const healthRouter = Router();
  mountHealthRoutes(healthRouter);
  app.use(healthRouter);

  // Preview proxy — auth required
  app.use('/preview/:previewId', authMiddleware, previewProxyMiddleware(registry));
  app.use('/preview/:previewId/*', authMiddleware, previewProxyMiddleware(registry));

  return app;
}
