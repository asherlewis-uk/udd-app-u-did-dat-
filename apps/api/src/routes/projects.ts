import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { requirePermission } from '@udd/auth';
import type { PlatformEvent } from '@udd/contracts';
import { getContext } from '../context.js';
import { createAppError } from '../middleware/error.js';

const router: Router = Router();

// -------------------------------------------------------
// Project listing within a workspace
// -------------------------------------------------------

router.get(
  '/workspaces/:id/projects',
  requirePermission('project.read'),
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
      if (limit !== undefined && isNaN(limit))
        return next(createAppError('limit must be a positive integer', 400, 'VALIDATION_ERROR'));
      const pageOpts: { cursor?: string; limit?: number } = {};
      if (cursor !== undefined) pageOpts.cursor = cursor;
      if (limit !== undefined) pageOpts.limit = limit;
      const page = await ctx.projects.findByWorkspaceId(req.params['id']!, pageOpts);

      return res.json({
        data: page.items,
        meta: { nextCursor: page.nextCursor, hasMore: page.hasMore },
        correlationId: req.correlationId,
      });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/workspaces/:id/projects',
  requirePermission('project.create'),
  async (req, res, next) => {
    try {
      const { name, slug, description } = req.body as {
        name?: string;
        slug?: string;
        description?: string;
      };
      if (!name || !slug) {
        return next(createAppError('name and slug are required', 400, 'VALIDATION_ERROR'));
      }

      const ctx = getContext();

      const membership = await ctx.memberships.findByUserAndWorkspace(
        req.auth!.userId,
        req.params['id']!,
      );
      if (!membership) return next(createAppError('Workspace not found', 404, 'NOT_FOUND'));

      const createProjectData: {
        workspaceId: string;
        name: string;
        slug: string;
        description?: string;
      } = {
        workspaceId: req.params['id']!,
        name,
        slug,
      };
      if (description !== undefined) createProjectData.description = description;
      const project = await ctx.projects.create(createProjectData);

      await ctx.auditLogs.append({
        workspaceId: req.params['id']!,
        actorUserId: req.auth!.userId,
        action: 'project.created',
        resourceType: 'project',
        resourceId: project.id,
        metadata: { name, slug },
      });

      await ctx.events.publish({
        eventId: randomUUID(),
        schemaVersion: 1,
        topic: 'project.created',
        payload: { projectId: project.id, workspaceId: project.workspaceId },
        correlationId: req.correlationId ?? 'unknown',
        timestamp: new Date().toISOString(),
      } as unknown as PlatformEvent);

      return res.status(201).json({ data: project, correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

// -------------------------------------------------------
// Project CRUD (by project ID)
// -------------------------------------------------------

router.get('/projects/:id', requirePermission('project.read'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const project = await ctx.projects.findById(req.params['id']!);
    if (!project) return next(createAppError('Project not found', 404, 'NOT_FOUND'));

    const membership = await ctx.memberships.findByUserAndWorkspace(
      req.auth!.userId,
      project.workspaceId,
    );
    if (!membership) return next(createAppError('Project not found', 404, 'NOT_FOUND'));

    return res.json({ data: project, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

router.patch('/projects/:id', requirePermission('project.update'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const project = await ctx.projects.findById(req.params['id']!);
    if (!project) return next(createAppError('Project not found', 404, 'NOT_FOUND'));

    const membership = await ctx.memberships.findByUserAndWorkspace(
      req.auth!.userId,
      project.workspaceId,
    );
    if (!membership) return next(createAppError('Project not found', 404, 'NOT_FOUND'));

    const { name, description } = req.body as { name?: string; description?: string };
    const updateData: Partial<Pick<import('@udd/contracts').Project, 'name' | 'description'>> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    const updated = await ctx.projects.update(project.id, updateData);

    await ctx.auditLogs.append({
      workspaceId: project.workspaceId,
      actorUserId: req.auth!.userId,
      action: 'project.updated',
      resourceType: 'project',
      resourceId: project.id,
      metadata: { name, description },
    });

    return res.json({ data: updated, correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

export default router;
