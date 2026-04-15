import { Router } from 'express';
import { requirePermission, signPreviewToken } from '@udd/auth';
import type { PlatformEvent } from '@udd/contracts';
import { randomUUID } from 'crypto';
import { getContext } from '../context.js';
import { createAppError } from '../middleware/error.js';
import { OptimisticConcurrencyError } from '@udd/database';
import { mapPreviewView } from './public-view-mappers.js';

const router: Router = Router();

// -------------------------------------------------------
// Create preview route for a session
// -------------------------------------------------------

router.post(
  '/sessions/:id/previews',
  requirePermission('preview.create'),
  async (req, res, next) => {
    try {
      const ctx = getContext();

      const session = await ctx.sessions.findById(req.params['id']!);
      if (!session) return next(createAppError('Session not found', 404, 'NOT_FOUND'));

      if (session.state !== 'running') {
        return next(
          createAppError(`Session is not running (state: ${session.state})`, 409, 'INVALID_STATE'),
        );
      }

      const membership = await ctx.memberships.findByUserAndWorkspace(
        req.auth!.userId,
        session.workspaceId,
      );
      if (!membership) return next(createAppError('Session not found', 404, 'NOT_FOUND'));

      if (!session.workerHost || session.hostPort == null) {
        return next(createAppError('Session has no assigned worker', 409, 'INVALID_STATE'));
      }

      // SECURITY: Validate worker target is not pointing to metadata/loopback.
      // The gateway also enforces this (defense-in-depth).
      const host = session.workerHost.toLowerCase();
      if (
        host === 'localhost' ||
        host.startsWith('127.') ||
        host.startsWith('169.254.') ||
        host === '0.0.0.0'
      ) {
        return next(createAppError('Session worker address is invalid', 409, 'INVALID_STATE'));
      }

      const { ttlSeconds } = req.body as { ttlSeconds?: number };
      const previewId = randomUUID();

      const createData: {
        previewId: string;
        sessionId: string;
        projectId: string;
        workspaceId: string;
        workerHost: string;
        hostPort: number;
        ttlSeconds?: number;
      } = {
        previewId,
        sessionId: session.id,
        projectId: session.projectId,
        workspaceId: session.workspaceId,
        workerHost: session.workerHost,
        hostPort: session.hostPort,
      };
      if (ttlSeconds !== undefined) createData.ttlSeconds = ttlSeconds;
      const binding = await ctx.previewRoutes.create(createData);

      await ctx.auditLogs.append({
        workspaceId: session.workspaceId,
        actorUserId: req.auth!.userId,
        action: 'preview.created',
        resourceType: 'preview_route',
        resourceId: binding.id,
        metadata: { previewId, sessionId: session.id },
      });

      await ctx.events.publish({
        eventId: randomUUID(),
        schemaVersion: 1,
        topic: 'preview.route.bound',
        payload: {
          previewId,
          sessionId: session.id,
          projectId: session.projectId,
          workspaceId: session.workspaceId,
          workerHost: session.workerHost,
          hostPort: session.hostPort,
          state: 'active' as const,
        },
        correlationId: req.correlationId ?? 'unknown',
        timestamp: new Date().toISOString(),
      });

      return res
        .status(201)
        .json({ data: mapPreviewView(binding), correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

// -------------------------------------------------------
// Get preview binding
// -------------------------------------------------------

router.get('/previews/:previewId', requirePermission('preview.read'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const binding = await ctx.previewRoutes.findByPreviewId(req.params['previewId']!);
    if (!binding) return next(createAppError('Preview not found', 404, 'NOT_FOUND'));

    const membership = await ctx.memberships.findByUserAndWorkspace(
      req.auth!.userId,
      binding.workspaceId,
    );
    if (!membership) return next(createAppError('Preview not found', 404, 'NOT_FOUND'));

    return res.json({ data: mapPreviewView(binding), correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

// -------------------------------------------------------
// Revoke preview binding
// -------------------------------------------------------

router.delete(
  '/previews/:previewId',
  requirePermission('preview.delete'),
  async (req, res, next) => {
    try {
      const ctx = getContext();
      const binding = await ctx.previewRoutes.findByPreviewId(req.params['previewId']!);
      if (!binding) return next(createAppError('Preview not found', 404, 'NOT_FOUND'));

      const membership = await ctx.memberships.findByUserAndWorkspace(
        req.auth!.userId,
        binding.workspaceId,
      );
      if (!membership) return next(createAppError('Preview not found', 404, 'NOT_FOUND'));

      await ctx.previewRoutes.updateState(binding.id, 'revoking', binding.version);

      await ctx.auditLogs.append({
        workspaceId: binding.workspaceId,
        actorUserId: req.auth!.userId,
        action: 'preview.revoked',
        resourceType: 'preview_route',
        resourceId: binding.id,
        metadata: { previewId: binding.previewId },
      });

      await ctx.events.publish({
        eventId: randomUUID(),
        schemaVersion: 1,
        topic: 'preview.route.revoked',
        payload: {
          previewId: binding.previewId,
          sessionId: binding.sessionId,
          workspaceId: binding.workspaceId,
          reason: 'user_requested',
        },
        correlationId: req.correlationId ?? 'unknown',
        timestamp: new Date().toISOString(),
      });

      return res.status(204).send();
    } catch (err) {
      if (err instanceof OptimisticConcurrencyError) {
        return next(
          createAppError('Concurrent modification detected, please retry', 409, 'CONFLICT'),
        );
      }
      return next(err);
    }
  },
);

// -------------------------------------------------------
// Issue a short-lived preview token for iframe/WKWebView access
// -------------------------------------------------------

router.post(
  '/previews/:previewId/token',
  requirePermission('preview.read'),
  async (req, res, next) => {
    try {
      const ctx = getContext();
      const binding = await ctx.previewRoutes.findByPreviewId(req.params['previewId']!);
      if (!binding) return next(createAppError('Preview not found', 404, 'NOT_FOUND'));

      if (binding.state !== 'active') {
        return next(createAppError(`Preview is ${binding.state}`, 410, 'PREVIEW_EXPIRED'));
      }

      if (binding.expiresAt && new Date(binding.expiresAt) < new Date()) {
        return next(createAppError('Preview has expired', 410, 'PREVIEW_EXPIRED'));
      }

      const membership = await ctx.memberships.findByUserAndWorkspace(
        req.auth!.userId,
        binding.workspaceId,
      );
      if (!membership) return next(createAppError('Preview not found', 404, 'NOT_FOUND'));

      const { token, expiresAt } = signPreviewToken(req.auth!.userId, binding.previewId);

      return res.json({
        data: { token, expiresAt },
        correlationId: req.correlationId,
      });
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
