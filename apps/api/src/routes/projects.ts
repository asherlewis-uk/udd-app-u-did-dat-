import { randomUUID } from 'node:crypto';
import { Router } from 'express';
import { requirePermission } from '@udd/auth';
import type { PlatformEvent } from '@udd/contracts';
import { getContext } from '../context.js';
import { createAppError } from '../middleware/error.js';
import { mapProjectView } from './public-view-mappers.js';

const router: Router = Router();

// -------------------------------------------------------
// Project CRUD (by project ID)
// -------------------------------------------------------

router.get('/projects/:id', requirePermission('project.read'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const project = await ctx.projects.findById(req.params['id']!);
    if (!project) return next(createAppError('Project not found', 404, 'NOT_FOUND'));

    if (!(await ctx.projects.isAccessibleByUser(project.id, req.auth!.userId))) {
      return next(createAppError('Project not found', 404, 'NOT_FOUND'));
    }

    return res.json({ data: mapProjectView(project), correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

router.patch('/projects/:id', requirePermission('project.update'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const project = await ctx.projects.findById(req.params['id']!);
    if (!project) return next(createAppError('Project not found', 404, 'NOT_FOUND'));

    if (!(await ctx.projects.isAccessibleByUser(project.id, req.auth!.userId))) {
      return next(createAppError('Project not found', 404, 'NOT_FOUND'));
    }

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

    return res.json({ data: mapProjectView(updated!), correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

// -------------------------------------------------------
// Canonical Project Listing and Creation
// -------------------------------------------------------

router.get('/projects', requirePermission('project.read'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const cursor = req.query['cursor'] as string | undefined;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
    if (limit !== undefined && isNaN(limit))
      return next(createAppError('limit must be a positive integer', 400, 'VALIDATION_ERROR'));

    const pageOpts: { cursor?: string; limit?: number } = {};
    if (cursor !== undefined) pageOpts.cursor = cursor;
    if (limit !== undefined) pageOpts.limit = limit;

    const page = await ctx.projects.findByUserId(req.auth!.userId, pageOpts);

    return res.json({
      data: page.items.map(mapProjectView),
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
});

router.post('/projects', requirePermission('project.create'), async (req, res, next) => {
  try {
    const { name, slug, description } = req.body as {
      name?: string;
      slug?: string;
      description?: string;
    };
    if (!name) return next(createAppError('name is required', 400, 'VALIDATION_ERROR'));

    const ctx = getContext();
    const workspaces = await ctx.workspaces.findByUserId(req.auth!.userId);
    const homeWorkspace = workspaces[0];
    if (!homeWorkspace) {
      return next(createAppError('No workspace available', 409, 'PROJECT_CONTAINER_UNAVAILABLE'));
    }

    let finalSlug = slug;
    if (!finalSlug) {
      finalSlug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      if (!finalSlug) {
        return next(createAppError('Invalid slug derived from name', 400, 'VALIDATION_ERROR'));
      }
    }

    const createProjectData: {
      workspaceId: string;
      name: string;
      slug: string;
      description?: string;
    } = {
      workspaceId: homeWorkspace.id,
      name,
      slug: finalSlug,
    };
    if (description !== undefined) createProjectData.description = description;
    const project = await ctx.projects.create(createProjectData);

    await ctx.auditLogs.append({
      workspaceId: homeWorkspace.id,
      actorUserId: req.auth!.userId,
      action: 'project.created',
      resourceType: 'project',
      resourceId: project.id,
      metadata: { name, slug: finalSlug },
    });

    await ctx.events.publish({
      eventId: randomUUID(),
      schemaVersion: 1,
      topic: 'project.created',
      payload: { projectId: project.id, workspaceId: project.workspaceId },
      correlationId: req.correlationId ?? 'unknown',
      timestamp: new Date().toISOString(),
    } as unknown as PlatformEvent);

    return res
      .status(201)
      .json({ data: mapProjectView(project), correlationId: req.correlationId });
  } catch (err) {
    return next(err);
  }
});

export default router;
