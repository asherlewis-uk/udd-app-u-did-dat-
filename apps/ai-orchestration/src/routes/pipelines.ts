import { Router } from 'express';
import { authMiddleware, requirePermission } from '@udd/auth';
import type { CreatePipelineRequest, UpdatePipelineRequest } from '@udd/contracts';
import { getContext } from '../context.js';
import { mapPipelineView } from './public-view-mappers.js';
import { validateDag } from '../dag-validator.js';

const router: Router = Router();
router.use(authMiddleware);

// =======================================================
// CANONICAL: /projects/:projectId/ai/pipelines
// =======================================================

router.get(
  '/projects/:projectId/ai/pipelines',
  requirePermission('ai.pipeline.read'),
  async (req, res, next) => {
    try {
      const ctx = getContext();
      const project = await ctx.projects.findById(req.params['projectId']!);
      if (!project || !(await ctx.projects.isAccessibleByUser(project.id, req.auth!.userId))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }

      const cursor = req.query['cursor'] as string | undefined;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
      if (limit !== undefined && isNaN(limit)) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'limit must be a positive integer',
          correlationId: req.correlationId,
        });
      }

      const pageOpts: { cursor?: string; limit?: number } = {};
      if (cursor !== undefined) pageOpts.cursor = cursor;
      if (limit !== undefined) pageOpts.limit = limit;

      const page = await ctx.pipelines.findByProjectId(project.id, pageOpts);

      return res.json({
        data: page.items.map(mapPipelineView),
        nextCursor: page.nextCursor,
        hasMore: page.hasMore,
        correlationId: req.correlationId,
      });
    } catch (err) {
      return next(err);
    }
  },
);

router.post(
  '/projects/:projectId/ai/pipelines',
  requirePermission('ai.pipeline.create'),
  async (req, res, next) => {
    try {
      const ctx = getContext();
      const project = await ctx.projects.findById(req.params['projectId']!);
      if (!project || !(await ctx.projects.isAccessibleByUser(project.id, req.auth!.userId))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }

      const body = req.body as CreatePipelineRequest;
      if (!body.name || !body.definition) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'name and definition are required',
          correlationId: req.correlationId,
        });
      }

      const dagResult = await validateDag(body.definition, project.workspaceId, ctx.agentRoles);
      if (!dagResult.valid) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: dagResult.errors.join('; '),
          errors: dagResult.errors,
          correlationId: req.correlationId,
        });
      }

      const pipeline = await ctx.pipelines.create({
        workspaceId: project.workspaceId,
        projectId: project.id,
        createdByUserId: req.auth!.userId,
        name: body.name,
        description: body.description ?? null,
        pipelineDefinitionJson: body.definition,
        ...(body.inputSchema !== undefined && { inputSchemaJson: body.inputSchema }),
        ...(body.outputSchema !== undefined && { outputSchemaJson: body.outputSchema }),
        isActive: true,
      });

      await ctx.auditLogs.append({
        workspaceId: project.workspaceId,
        actorUserId: req.auth!.userId,
        action: 'ai.pipeline.created',
        resourceType: 'pipeline_definition',
        resourceId: pipeline.id,
        metadata: { name: body.name, projectId: project.id },
      });

      return res
        .status(201)
        .json({ data: mapPipelineView(pipeline), correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/projects/:projectId/ai/pipelines/:pipelineId',
  requirePermission('ai.pipeline.read'),
  async (req, res, next) => {
    try {
      const ctx = getContext();
      const pipeline = await ctx.pipelines.findById(req.params['pipelineId']!);
      if (!pipeline || pipeline.projectId !== req.params['projectId']!) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }

      const project = await ctx.projects.findById(req.params['projectId']!);
      if (!project || !(await ctx.projects.isAccessibleByUser(project.id, req.auth!.userId))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }

      return res.json({ data: mapPipelineView(pipeline), correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/projects/:projectId/ai/pipelines/:pipelineId',
  requirePermission('ai.pipeline.update'),
  async (req, res, next) => {
    try {
      const ctx = getContext();
      const pipeline = await ctx.pipelines.findById(req.params['pipelineId']!);
      if (!pipeline || pipeline.projectId !== req.params['projectId']!) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }

      const project = await ctx.projects.findById(req.params['projectId']!);
      if (!project || !(await ctx.projects.isAccessibleByUser(project.id, req.auth!.userId))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }

      const body = req.body as UpdatePipelineRequest;
      if (body.definition) {
        const dagResult = await validateDag(body.definition, project.workspaceId, ctx.agentRoles);
        if (!dagResult.valid) {
          return res.status(400).json({
            code: 'VALIDATION_ERROR',
            message: dagResult.errors.join('; '),
            errors: dagResult.errors,
            correlationId: req.correlationId,
          });
        }
      }

      const updated = await ctx.pipelines.update(pipeline.id, {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.definition !== undefined && { pipelineDefinitionJson: body.definition }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      });

      await ctx.auditLogs.append({
        workspaceId: project.workspaceId,
        actorUserId: req.auth!.userId,
        action: 'ai.pipeline.updated',
        resourceType: 'pipeline_definition',
        resourceId: pipeline.id,
        metadata: { name: body.name, isActive: body.isActive, projectId: project.id },
      });

      return res.json({ data: mapPipelineView(updated!), correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

router.delete(
  '/projects/:projectId/ai/pipelines/:pipelineId',
  requirePermission('ai.pipeline.delete'),
  async (req, res, next) => {
    try {
      const ctx = getContext();
      const pipeline = await ctx.pipelines.findById(req.params['pipelineId']!);
      if (!pipeline || pipeline.projectId !== req.params['projectId']!) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }

      const project = await ctx.projects.findById(req.params['projectId']!);
      if (!project || !(await ctx.projects.isAccessibleByUser(project.id, req.auth!.userId))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }

      await ctx.pipelines.delete(pipeline.id);

      await ctx.auditLogs.append({
        workspaceId: project.workspaceId,
        actorUserId: req.auth!.userId,
        action: 'ai.pipeline.deleted',
        resourceType: 'pipeline_definition',
        resourceId: pipeline.id,
        metadata: { projectId: project.id },
      });

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
