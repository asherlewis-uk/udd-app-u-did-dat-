import { Router } from 'express';
import { requirePermission } from '@udd/auth';
import type { PlatformEvent } from '@udd/contracts';
import { getContext } from '../context.js';
import { createAppError } from '../middleware/error.js';

const router = Router();

// -------------------------------------------------------
// Workspaces
// -------------------------------------------------------

router.get('/workspaces', async (req, res, next) => {
  try {
    const ctx = getContext();
    const workspaces = await ctx.workspaces.findByUserId(req.auth!.userId);
    return res.json({ data: workspaces, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

router.post('/workspaces', requirePermission('workspace.create'), async (req, res, next) => {
  try {
    const { name, slug } = req.body as { name?: string; slug?: string };
    if (!name || !slug) {
      return next(createAppError('name and slug are required', 400, 'VALIDATION_ERROR'));
    }

    const ctx = getContext();

    // We need an organization. For now derive it from env or use userId as org placeholder.
    const organizationId =
      (req.body as { organizationId?: string }).organizationId ??
      process.env['DEFAULT_ORGANIZATION_ID'];
    if (!organizationId) {
      return next(createAppError('organizationId is required', 400, 'VALIDATION_ERROR'));
    }

    const workspace = await ctx.workspaces.create({ organizationId, name, slug });

    // Auto-enroll creator as org_owner
    await ctx.memberships.create({
      userId: req.auth!.userId,
      workspaceId: workspace.id,
      role: 'org_owner',
    });

    await ctx.auditLogs.append({
      workspaceId: workspace.id,
      actorUserId: req.auth!.userId,
      action: 'workspace.created',
      resourceType: 'workspace',
      resourceId: workspace.id,
      metadata: { name, slug },
    });

    await ctx.events.publish({
      topic: 'workspace.created',
      payload: { workspaceId: workspace.id, organizationId, name, slug },
      correlationId: req.correlationId ?? 'unknown',
      timestamp: new Date().toISOString(),
    } as PlatformEvent);

    return res.status(201).json({ data: workspace, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

router.get('/workspaces/:id', requirePermission('workspace.read'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const workspace = await ctx.workspaces.findById(req.params['id']!);
    if (!workspace) return next(createAppError('Workspace not found', 404, 'NOT_FOUND'));

    const membership = await ctx.memberships.findByUserAndWorkspace(
      req.auth!.userId,
      workspace.id,
    );
    if (!membership) return next(createAppError('Workspace not found', 404, 'NOT_FOUND'));

    return res.json({ data: workspace, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

// -------------------------------------------------------
// Members
// -------------------------------------------------------

router.get(
  '/workspaces/:id/members',
  requirePermission('workspace.read'),
  async (req, res, next) => {
    try {
      const ctx = getContext();
      const membership = await ctx.memberships.findByUserAndWorkspace(
        req.auth!.userId,
        req.params['id']!,
      );
      if (!membership) return next(createAppError('Workspace not found', 404, 'NOT_FOUND'));

      const cursor = req.query['cursor'] as string | undefined;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
      const page = await ctx.memberships.findByWorkspaceId(req.params['id']!, { cursor, limit });

      return res.json({ data: page.items, meta: { nextCursor: page.nextCursor, hasMore: page.hasMore }, correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/workspaces/:id/invitations',
  requirePermission('member.invite'),
  async (req, res, next) => {
    try {
      const { userId, role } = req.body as { userId?: string; role?: string };
      if (!userId || !role) {
        return next(createAppError('userId and role are required', 400, 'VALIDATION_ERROR'));
      }

      const ctx = getContext();

      const callerMembership = await ctx.memberships.findByUserAndWorkspace(
        req.auth!.userId,
        req.params['id']!,
      );
      if (!callerMembership) return next(createAppError('Workspace not found', 404, 'NOT_FOUND'));

      const existing = await ctx.memberships.findByUserAndWorkspace(userId, req.params['id']!);
      if (existing) return next(createAppError('User is already a member', 409, 'CONFLICT'));

      const membership = await ctx.memberships.create({
        userId,
        workspaceId: req.params['id']!,
        role: role as 'workspace_member',
      });

      await ctx.auditLogs.append({
        workspaceId: req.params['id']!,
        actorUserId: req.auth!.userId,
        action: 'workspace.member.added',
        resourceType: 'membership',
        resourceId: membership.id,
        metadata: { userId, role },
      });

      return res.status(201).json({ data: membership, correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
