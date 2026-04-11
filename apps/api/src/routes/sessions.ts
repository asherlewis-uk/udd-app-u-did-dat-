import { Router } from 'express';
import { requirePermission } from '@udd/auth';
import type { PlatformEvent } from '@udd/contracts';
import { getContext } from '../context.js';
import { createAppError } from '../middleware/error.js';
import { OptimisticConcurrencyError, withTransaction } from '@udd/database';

const router = Router();

// -------------------------------------------------------
// Create session for a project
// -------------------------------------------------------

router.post(
  '/projects/:id/sessions',
  requirePermission('session.create'),
  async (req, res, next) => {
    try {
      const ctx = getContext();

      const project = await ctx.projects.findById(req.params['id']!);
      if (!project) return next(createAppError('Project not found', 404, 'NOT_FOUND'));

      const membership = await ctx.memberships.findByUserAndWorkspace(
        req.auth!.userId,
        project.workspaceId,
      );
      if (!membership) return next(createAppError('Project not found', 404, 'NOT_FOUND'));

      const { idleTimeoutSeconds } = req.body as { idleTimeoutSeconds?: number };

      const session = await ctx.sessions.create({
        projectId: project.id,
        workspaceId: project.workspaceId,
        userId: req.auth!.userId,
        idleTimeoutSeconds,
      });

      await ctx.auditLogs.append({
        workspaceId: project.workspaceId,
        actorUserId: req.auth!.userId,
        action: 'session.created',
        resourceType: 'session',
        resourceId: session.id,
        metadata: { projectId: project.id },
      });

      await ctx.events.publish({
        topic: 'session.created',
        payload: { sessionId: session.id, projectId: project.id, workspaceId: project.workspaceId, userId: req.auth!.userId },
        correlationId: req.correlationId ?? 'unknown',
        timestamp: new Date().toISOString(),
      } as PlatformEvent);

      return res.status(201).json({ data: session, correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

// -------------------------------------------------------
// Get session by ID
// -------------------------------------------------------

router.get('/sessions/:id', requirePermission('session.start'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const session = await ctx.sessions.findById(req.params['id']!);
    if (!session) return next(createAppError('Session not found', 404, 'NOT_FOUND'));

    const membership = await ctx.memberships.findByUserAndWorkspace(
      req.auth!.userId,
      session.workspaceId,
    );
    if (!membership) return next(createAppError('Session not found', 404, 'NOT_FOUND'));

    return res.json({ data: session, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

// -------------------------------------------------------
// Session lifecycle
// -------------------------------------------------------

router.post('/sessions/:id/start', requirePermission('session.start'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const session = await ctx.sessions.findById(req.params['id']!);
    if (!session) return next(createAppError('Session not found', 404, 'NOT_FOUND'));

    const membership = await ctx.memberships.findByUserAndWorkspace(
      req.auth!.userId,
      session.workspaceId,
    );
    if (!membership) return next(createAppError('Session not found', 404, 'NOT_FOUND'));

    if (session.state !== 'creating' && session.state !== 'idle') {
      return next(createAppError(`Cannot start session in state '${session.state}'`, 409, 'INVALID_STATE'));
    }

    const updated = await ctx.sessions.updateState(session.id, 'starting', session.version);

    await ctx.events.publish({
      topic: 'session.state_changed',
      payload: { sessionId: session.id, from: session.state, to: 'starting' },
      correlationId: req.correlationId ?? 'unknown',
      timestamp: new Date().toISOString(),
    } as PlatformEvent);

    return res.json({ data: updated, correlationId: req.correlationId });
  } catch (err) {
    if (err instanceof OptimisticConcurrencyError) {
      return next(createAppError('Concurrent modification detected, please retry', 409, 'CONFLICT'));
    }
    return next(err);
  }
});

router.post('/sessions/:id/stop', requirePermission('session.stop'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const session = await ctx.sessions.findById(req.params['id']!);
    if (!session) return next(createAppError('Session not found', 404, 'NOT_FOUND'));

    const membership = await ctx.memberships.findByUserAndWorkspace(
      req.auth!.userId,
      session.workspaceId,
    );
    if (!membership) return next(createAppError('Session not found', 404, 'NOT_FOUND'));

    if (!['running', 'idle', 'starting'].includes(session.state)) {
      return next(createAppError(`Cannot stop session in state '${session.state}'`, 409, 'INVALID_STATE'));
    }

    // Revoke preview routes and transition state atomically (H-1 fix):
    // if the state update fails (concurrent version bump), the revocations
    // also roll back — routes are never orphaned while the session stays running.
    const updated = await withTransaction(async (client) => {
      await ctx.previewRoutes.revokeAllForSession(session.id, client);
      return ctx.sessions.updateState(session.id, 'stopping', session.version, undefined, client);
    });

    await ctx.auditLogs.append({
      workspaceId: session.workspaceId,
      actorUserId: req.auth!.userId,
      action: 'session.stopped',
      resourceType: 'session',
      resourceId: session.id,
      metadata: { reason: 'user_requested' },
    });

    await ctx.events.publish({
      topic: 'session.state_changed',
      payload: { sessionId: session.id, from: session.state, to: 'stopping' },
      correlationId: req.correlationId ?? 'unknown',
      timestamp: new Date().toISOString(),
    } as PlatformEvent);

    return res.json({ data: updated, correlationId: req.correlationId });
  } catch (err) {
    if (err instanceof OptimisticConcurrencyError) {
      return next(createAppError('Concurrent modification detected, please retry', 409, 'CONFLICT'));
    }
    return next(err);
  }
});

router.post('/sessions/:id/checkpoint', requirePermission('session.stop'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const session = await ctx.sessions.findById(req.params['id']!);
    if (!session) return next(createAppError('Session not found', 404, 'NOT_FOUND'));

    const membership = await ctx.memberships.findByUserAndWorkspace(
      req.auth!.userId,
      session.workspaceId,
    );
    if (!membership) return next(createAppError('Session not found', 404, 'NOT_FOUND'));

    // Emit checkpoint event — actual snapshotting is done by the host-agent
    await ctx.events.publish({
      topic: 'session.checkpoint_requested',
      payload: { sessionId: session.id, requestedByUserId: req.auth!.userId },
      correlationId: req.correlationId ?? 'unknown',
      timestamp: new Date().toISOString(),
    } as PlatformEvent);

    return res.status(202).json({
      data: { message: 'Checkpoint initiated', sessionId: session.id },
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
});

router.get('/sessions/:id/logs', requirePermission('session.start'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const session = await ctx.sessions.findById(req.params['id']!);
    if (!session) return next(createAppError('Session not found', 404, 'NOT_FOUND'));

    const membership = await ctx.memberships.findByUserAndWorkspace(
      req.auth!.userId,
      session.workspaceId,
    );
    if (!membership) return next(createAppError('Session not found', 404, 'NOT_FOUND'));

    // Streaming logs are served by the host-agent; API returns 501 until Phase 3 wires streaming
    return res.status(501).json({
      code: 'NOT_IMPLEMENTED',
      message: 'Log streaming is served by the host-agent WebSocket endpoint',
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
});

export default router;
