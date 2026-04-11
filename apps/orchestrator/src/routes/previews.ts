import { Router, type Router as RouterType } from 'express';
import { authMiddleware, requirePermission } from '@udd/auth';
import { randomUUID } from 'crypto';
import {
  PgSessionRepository,
  PgPreviewRouteRepository,
  OptimisticConcurrencyError,
} from '@udd/database';

const router: RouterType = Router();
router.use(authMiddleware);

const sessions = new PgSessionRepository();
const previewRoutes = new PgPreviewRouteRepository();

router.post('/sessions/:id/previews', requirePermission('preview.create'), async (req, res, next) => {
  try {
    const session = await sessions.findById(req.params['id']!);
    if (!session) return next(Object.assign(new Error('Session not found'), { statusCode: 404, code: 'NOT_FOUND' }));

    if (session.state !== 'running') {
      return res.status(409).json({ code: 'INVALID_STATE', message: `Session is not running (state: ${session.state})`, correlationId: req.correlationId });
    }

    if (!session.workerHost || session.hostPort == null) {
      return res.status(409).json({ code: 'INVALID_STATE', message: 'Session has no assigned worker', correlationId: req.correlationId });
    }

    const { ttlSeconds } = req.body as { ttlSeconds?: number };
    const createData: {
      previewId: string;
      sessionId: string;
      projectId: string;
      workspaceId: string;
      workerHost: string;
      hostPort: number;
      ttlSeconds?: number;
    } = {
      previewId: randomUUID(),
      sessionId: session.id,
      projectId: session.projectId,
      workspaceId: session.workspaceId,
      workerHost: session.workerHost,
      hostPort: session.hostPort,
    };
    if (ttlSeconds !== undefined) createData.ttlSeconds = ttlSeconds;
    const binding = await previewRoutes.create(createData);

    // Strip internal routing fields from response
    const { workerHost: _w, hostPort: _p, ...safeBinding } = binding;
    void _w; void _p;

    return res.status(201).json({ data: safeBinding, correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

router.get('/previews/:previewId', requirePermission('preview.read'), async (req, res, next) => {
  try {
    const binding = await previewRoutes.findByPreviewId(req.params['previewId']!);
    if (!binding) return next(Object.assign(new Error('Preview not found'), { statusCode: 404, code: 'NOT_FOUND' }));

    const { workerHost: _w, hostPort: _p, ...safeBinding } = binding;
    void _w; void _p;

    return res.json({ data: safeBinding, correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

router.delete('/previews/:previewId', requirePermission('preview.delete'), async (req, res, next) => {
  try {
    const binding = await previewRoutes.findByPreviewId(req.params['previewId']!);
    if (!binding) return next(Object.assign(new Error('Preview not found'), { statusCode: 404, code: 'NOT_FOUND' }));

    await previewRoutes.updateState(binding.id, 'revoking', binding.version);
    return res.status(204).send();
  } catch (err) {
    if (err instanceof OptimisticConcurrencyError) {
      return res.status(409).json({ code: 'CONFLICT', message: 'Concurrent modification', correlationId: req.correlationId });
    }
    return next(err);
  }
});

export default router;
