import { Router, type Router as RouterType } from 'express';
import { authMiddleware, requirePermission } from '@udd/auth';
import { PgSessionService, OptimisticConcurrencyError } from '../services/session.js';
import { PgProjectRepository } from '@udd/database';

const router: RouterType = Router();
router.use(authMiddleware);

const sessionService = new PgSessionService();
const projects = new PgProjectRepository();

function nextWithConcurrencyGuard(err: unknown, next: (e: unknown) => void): void {
  if (err instanceof OptimisticConcurrencyError) {
    const conflict = new Error('Concurrent modification, please retry') as Error & { statusCode: number; code: string };
    conflict.statusCode = 409;
    conflict.code = 'CONFLICT';
    return next(conflict);
  }
  next(err);
}

router.post('/projects/:projectId/sessions', requirePermission('session.create'), async (req, res, next) => {
  try {
    const { idleTimeoutSeconds } = req.body as { idleTimeoutSeconds?: number };
    // Resolve workspace from the project (internal tenancy key, ADR 013).
    // Do NOT read workspace from JWT claims — tokens no longer carry it.
    const project = await projects.findById(req.params['projectId']!);
    if (!project) {
      const err = new Error('Project not found') as Error & { statusCode: number; code: string };
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }
    const createParams: Parameters<typeof sessionService.createSession>[0] = {
      projectId: project.id,
      workspaceId: project.workspaceId,
      userId: req.auth!.userId,
      correlationId: req.correlationId ?? 'unknown',
    };
    if (idleTimeoutSeconds !== undefined) createParams.idleTimeoutSeconds = idleTimeoutSeconds;
    const session = await sessionService.createSession(createParams);
    return res.status(201).json({ data: session, correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

router.get('/sessions/:id', requirePermission('session.start'), async (req, res, next) => {
  try {
    const session = await sessionService.getSession(req.params['id']!);
    if (!session) {
      const err = new Error('Session not found') as Error & { statusCode: number; code: string };
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      return next(err);
    }
    return res.json({ data: session, correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

router.post('/sessions/:id/start', requirePermission('session.start'), async (req, res, next) => {
  try {
    const session = await sessionService.startSession({
      sessionId: req.params['id']!,
      correlationId: req.correlationId ?? 'unknown',
    });
    return res.json({ data: session, correlationId: req.correlationId });
  } catch (err) { return nextWithConcurrencyGuard(err, next); }
});

router.post('/sessions/:id/stop', requirePermission('session.stop'), async (req, res, next) => {
  try {
    const { reason } = req.body as { reason?: string };
    const stopParams: Parameters<typeof sessionService.stopSession>[0] = {
      sessionId: req.params['id']!,
      correlationId: req.correlationId ?? 'unknown',
    };
    if (reason !== undefined) stopParams.reason = reason;
    const session = await sessionService.stopSession(stopParams);
    return res.json({ data: session, correlationId: req.correlationId });
  } catch (err) { return nextWithConcurrencyGuard(err, next); }
});

router.post('/sessions/:id/checkpoint', requirePermission('session.stop'), async (req, res, next) => {
  try {
    const session = await sessionService.getSession(req.params['id']!);
    if (!session) return next(Object.assign(new Error('Session not found'), { statusCode: 404, code: 'NOT_FOUND' }));
    // Checkpoint initiation is a signal to the host-agent; orchestrator just acknowledges
    return res.status(202).json({ data: { sessionId: session.id, message: 'Checkpoint initiated' }, correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

router.get('/sessions/:id/logs', requirePermission('session.start'), async (req, res) => {
  return res.status(501).json({ code: 'NOT_IMPLEMENTED', message: 'Log streaming served by host-agent WebSocket', correlationId: req.correlationId });
});

export default router;
