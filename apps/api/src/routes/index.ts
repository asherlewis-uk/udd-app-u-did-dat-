import { Router } from 'express';
import { authMiddleware } from '@udd/auth';
import { config } from '@udd/config';
import authRouter from './auth.js';
import workspacesRouter from './workspaces.js';
import projectsRouter from './projects.js';
import sessionsRouter from './sessions.js';
import previewsRouter from './previews.js';
import collaborationRouter from './collaboration.js';

const router: Router = Router();

// -------------------------------------------------------
// Public routes (no auth required)
// -------------------------------------------------------
router.use(authRouter);

// -------------------------------------------------------
// Authenticated routes
// -------------------------------------------------------
router.use(authMiddleware);

// GET /me
router.get('/me', (req, res) => {
  res.json({
    data: {
      id: req.auth?.userId,
      email: req.auth?.email,
      displayName: req.auth?.displayName,
    },
    correlationId: req.correlationId,
  });
});

router.use(workspacesRouter);
router.use(projectsRouter);
router.use(sessionsRouter);
router.use(previewsRouter);
router.use(collaborationRouter);

// -------------------------------------------------------
// AI routes — proxy to ai-orchestration service
// The ai-orchestration service itself enforces auth/RBAC.
// -------------------------------------------------------

const AI_ORCHESTRATION_URL = config.services.aiOrchestrationBaseUrl();

const AI_PREFIXES = [
  '/me/ai/providers',
  '/projects/:projectId/ai/roles',
  '/projects/:projectId/ai/pipelines',
  '/projects/:projectId/ai/runs',
];

for (const prefix of AI_PREFIXES) {
  router.all(`${prefix}*` as string, async (req, res, next) => {
    try {
      const targetPath = req.originalUrl.replace(/^\/v1/, '');
      const targetUrl = `${AI_ORCHESTRATION_URL}/v1${targetPath}`;

      const proxyResp = await fetch(targetUrl, {
        method: req.method,
        headers: {
          'content-type': 'application/json',
          authorization: req.headers.authorization ?? '',
          'x-correlation-id': req.correlationId ?? 'unknown',
        },
        body: ['GET', 'HEAD'].includes(req.method) ? null : JSON.stringify(req.body),
      });

      const body = await proxyResp.text();
      res.status(proxyResp.status);
      proxyResp.headers.forEach((value, key) => {
        if (!['transfer-encoding', 'connection'].includes(key.toLowerCase())) {
          res.setHeader(key, value);
        }
      });
      res.send(body);
    } catch (err) {
      next(err);
    }
  });
}

export default router;
