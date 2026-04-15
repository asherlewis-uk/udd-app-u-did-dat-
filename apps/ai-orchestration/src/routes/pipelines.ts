import { Router } from 'express';
import { authMiddleware, requirePermission } from '@udd/auth';
import type { PipelineDefinition, PlatformEvent } from '@udd/contracts';
import { getContext } from '../context.js';
import { mapPipelineView } from './public-view-mappers.js';
import { validateDag } from '../dag-validator.js';

const router: Router = Router();
router.use(authMiddleware);

async function assertMember(
  ctx: ReturnType<typeof getContext>,
  userId: string,
  workspaceId: string,
) {
  return ctx.memberships.findByUserAndWorkspace(userId, workspaceId);
}

router.get(
  '/workspaces/:id/ai/pipelines',
  requirePermission('ai.pipeline.read'),
  async (req, res, next) => {
    try {
      res.append('Deprecation', 'true');
      const ctx = getContext();
      if (!(await assertMember(ctx, req.auth!.userId, req.params['id']!))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }
      const cursor = req.query['cursor'] as string | undefined;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
      if (limit !== undefined && isNaN(limit))
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'limit must be a positive integer',
          correlationId: req.correlationId,
        });
      const page = await ctx.pipelines.findByWorkspaceId(req.params['id']!, {
        ...(cursor !== undefined && { cursor }),
        ...(limit !== undefined && { limit }),
      });
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
  '/workspaces/:id/ai/pipelines',
  requirePermission('ai.pipeline.create'),
  async (req, res, next) => {
    try {
      res.append('Deprecation', 'true');
      const ctx = getContext();
      if (!(await assertMember(ctx, req.auth!.userId, req.params['id']!))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }

      const body = req.body as {
        name?: string;
        description?: string;
        pipelineDefinitionJson?: PipelineDefinition['pipelineDefinitionJson'];
        inputSchemaJson?: Record<string, unknown>;
        outputSchemaJson?: Record<string, unknown>;
      };

      if (!body.name || !body.pipelineDefinitionJson) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: 'name and pipelineDefinitionJson are required',
          correlationId: req.correlationId,
        });
      }

      // DAG validation — must pass before storage
      const dagResult = await validateDag(
        body.pipelineDefinitionJson,
        req.params['id']!,
        ctx.agentRoles,
      );
      if (!dagResult.valid) {
        return res.status(400).json({
          code: 'VALIDATION_ERROR',
          message: dagResult.errors.join('; '),
          errors: dagResult.errors,
          correlationId: req.correlationId,
        });
      }

      const pipeline = await ctx.pipelines.create({
        workspaceId: req.params['id']!,
        projectId: null,
        createdByUserId: req.auth!.userId,
        name: body.name,
        description: body.description ?? null,
        pipelineDefinitionJson: body.pipelineDefinitionJson,
        ...(body.inputSchemaJson !== undefined && { inputSchemaJson: body.inputSchemaJson }),
        ...(body.outputSchemaJson !== undefined && { outputSchemaJson: body.outputSchemaJson }),
        isActive: true,
      });

      await ctx.auditLogs.append({
        workspaceId: req.params['id']!,
        actorUserId: req.auth!.userId,
        action: 'ai.pipeline.created',
        resourceType: 'pipeline_definition',
        resourceId: pipeline.id,
        metadata: { name: body.name },
      });

      return res.status(201).json({ data: pipeline, correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

router.get(
  '/workspaces/:id/ai/pipelines/:pipelineId',
  requirePermission('ai.pipeline.read'),
  async (req, res, next) => {
    try {
      res.append('Deprecation', 'true');
      const ctx = getContext();
      if (!(await assertMember(ctx, req.auth!.userId, req.params['id']!))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }
      const pipeline = await ctx.pipelines.findById(req.params['pipelineId']!);
      if (!pipeline || pipeline.workspaceId !== req.params['id']!) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }
      return res.json({ data: pipeline, correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

router.patch(
  '/workspaces/:id/ai/pipelines/:pipelineId',
  requirePermission('ai.pipeline.update'),
  async (req, res, next) => {
    try {
      res.append('Deprecation', 'true');
      const ctx = getContext();
      if (!(await assertMember(ctx, req.auth!.userId, req.params['id']!))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }
      const pipeline = await ctx.pipelines.findById(req.params['pipelineId']!);
      if (!pipeline || pipeline.workspaceId !== req.params['id']!) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }

      const { name, description, pipelineDefinitionJson, isActive } = req.body as Partial<
        Pick<PipelineDefinition, 'name' | 'description' | 'pipelineDefinitionJson' | 'isActive'>
      >;

      // Re-validate DAG if definition is changing
      if (pipelineDefinitionJson) {
        const dagResult = await validateDag(
          pipelineDefinitionJson,
          req.params['id']!,
          ctx.agentRoles,
        );
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
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(pipelineDefinitionJson !== undefined && { pipelineDefinitionJson }),
        ...(isActive !== undefined && { isActive }),
      });

      await ctx.auditLogs.append({
        workspaceId: req.params['id']!,
        actorUserId: req.auth!.userId,
        action: 'ai.pipeline.updated',
        resourceType: 'pipeline_definition',
        resourceId: pipeline.id,
        metadata: { name, isActive },
      });

      return res.json({ data: updated, correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

router.delete(
  '/workspaces/:id/ai/pipelines/:pipelineId',
  requirePermission('ai.pipeline.delete'),
  async (req, res, next) => {
    try {
      res.append('Deprecation', 'true');
      const ctx = getContext();
      if (!(await assertMember(ctx, req.auth!.userId, req.params['id']!))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }
      const pipeline = await ctx.pipelines.findById(req.params['pipelineId']!);
      if (!pipeline || pipeline.workspaceId !== req.params['id']!) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }
      await ctx.pipelines.delete(pipeline.id);

      await ctx.auditLogs.append({
        workspaceId: req.params['id']!,
        actorUserId: req.auth!.userId,
        action: 'ai.pipeline.deleted',
        resourceType: 'pipeline_definition',
        resourceId: pipeline.id,
        metadata: {},
      });

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  },
);


// =======================================================
// CANONICAL: /projects/:projectId/ai/pipelines
// =======================================================

router.get('/projects/:projectId/ai/pipelines', requirePermission('ai.pipeline.read'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const project = await ctx.projects.findById(req.params['projectId']!);
    if (!project || !(await assertMember(ctx, req.auth!.userId, project.workspaceId))) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }
    const cursor = req.query['cursor'] as string | undefined;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
    const pageOpts: { cursor?: string; limit?: number } = {};
    if (cursor !== undefined) pageOpts.cursor = cursor;
    if (limit !== undefined) pageOpts.limit = limit;
    const page = await ctx.pipelines.findByProjectId(project.id, pageOpts);
    return res.json({ data: page.items.map(mapPipelineView), meta: { nextCursor: page.nextCursor, hasMore: page.hasMore }, correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

router.post('/projects/:projectId/ai/pipelines', requirePermission('ai.pipeline.create'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const project = await ctx.projects.findById(req.params['projectId']!);
    if (!project || !(await assertMember(ctx, req.auth!.userId, project.workspaceId))) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }
    const body = req.body;
    if (!body.name || !body.pipelineDefinitionJson) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Missing fields', correlationId: req.correlationId });
    }
    const dagResult = await validateDag(body.pipelineDefinitionJson, project.workspaceId, ctx.agentRoles);
    if (!dagResult.valid) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: dagResult.errors.join('; '), correlationId: req.correlationId });
    }
    const pipeline = await ctx.pipelines.create({
      workspaceId: project.workspaceId,
      projectId: project.id,
      createdByUserId: req.auth!.userId,
      name: body.name,
      description: body.description ?? null,
      pipelineDefinitionJson: body.pipelineDefinitionJson,
      ...(body.inputSchemaJson !== undefined && { inputSchemaJson: body.inputSchemaJson }),
      ...(body.outputSchemaJson !== undefined && { outputSchemaJson: body.outputSchemaJson }),
      isActive: true,
    });
    return res.status(201).json({ data: mapPipelineView(pipeline), correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

router.get('/projects/:projectId/ai/pipelines/:pipelineId', requirePermission('ai.pipeline.read'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const p = await ctx.pipelines.findById(req.params['pipelineId']!);
    if (!p || p.projectId !== req.params['projectId']!) return res.status(404).json({ code: 'NOT_FOUND' });
    const project = await ctx.projects.findById(req.params['projectId']!);
    if (!project || !(await assertMember(ctx, req.auth!.userId, project.workspaceId))) return res.status(404).json({ code: 'NOT_FOUND' });
    return res.json({ data: mapPipelineView(p), correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

router.patch('/projects/:projectId/ai/pipelines/:pipelineId', requirePermission('ai.pipeline.update'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const p = await ctx.pipelines.findById(req.params['pipelineId']!);
    if (!p || p.projectId !== req.params['projectId']!) return res.status(404).json({ code: 'NOT_FOUND' });
    const project = await ctx.projects.findById(req.params['projectId']!);
    if (!project || !(await assertMember(ctx, req.auth!.userId, project.workspaceId))) return res.status(404).json({ code: 'NOT_FOUND' });
    
    if (req.body.pipelineDefinitionJson) {
      const dagResult = await validateDag(req.body.pipelineDefinitionJson, project.workspaceId, ctx.agentRoles);
      if (!dagResult.valid) return res.status(400).json({ code: 'VALIDATION_ERROR', message: dagResult.errors.join('; ') });
    }
    const updated = await ctx.pipelines.update(p.id, req.body);
    return res.json({ data: mapPipelineView(updated!), correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

router.delete('/projects/:projectId/ai/pipelines/:pipelineId', requirePermission('ai.pipeline.delete'), async (req, res, next) => {
  try {
    const ctx = getContext();
    const p = await ctx.pipelines.findById(req.params['pipelineId']!);
    if (!p || p.projectId !== req.params['projectId']!) return res.status(404).json({ code: 'NOT_FOUND' });
    const project = await ctx.projects.findById(req.params['projectId']!);
    if (!project || !(await assertMember(ctx, req.auth!.userId, project.workspaceId))) return res.status(404).json({ code: 'NOT_FOUND' });
    await ctx.pipelines.delete(p.id);
    return res.status(204).send();
  } catch (err) { return next(err); }
});

export default router;
