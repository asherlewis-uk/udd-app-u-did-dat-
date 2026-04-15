import express, { Router } from 'express';
import helmet from 'helmet';
import { correlationIdMiddleware, mountHealthRoutes } from '@udd/observability';
import { authMiddleware } from '@udd/auth';
import { previewAuthMiddleware } from './preview-auth.js';
import { previewProxyMiddleware, type PreviewRouteRegistry } from './proxy.js';

export function createApp(registry: PreviewRouteRegistry): express.Application {
  const app = express();

  app.use(helmet({ contentSecurityPolicy: false })); // CSP disabled — proxied apps set their own
  app.use(correlationIdMiddleware);

  // Health routes (no auth)
  const healthRouter = Router();
  mountHealthRoutes(healthRouter);
  app.use(healthRouter);

  // Preview proxy — auth via Bearer header OR short-lived preview token query param.
  // previewAuthMiddleware tries Bearer first, then falls back to ?preview_token=<jwt>.
  // Full authorization (route state, membership, TTL, target) is always enforced by the proxy.
  app.use('/preview/:previewId', previewAuthMiddleware, previewProxyMiddleware(registry));
  app.use('/preview/:previewId/*', previewAuthMiddleware, previewProxyMiddleware(registry));

  return app;
}
