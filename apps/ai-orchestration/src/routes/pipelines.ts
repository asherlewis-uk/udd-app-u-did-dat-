import { Router } from 'express';
import { authMiddleware, requirePermission } from '@udd/auth';
import type { PipelineDefinition, PlatformEvent } from '@udd/contracts';
import { getContext } from '../context.js';
import { validateDag } from '../dag-validator.js';

const router = Router();
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
      const ctx = getContext();
      if (!(await assertMember(ctx, req.auth!.userId, req.params['id']!))) {
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
      }
      const cursor = req.query['cursor'] as string | undefined;
      const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
      if (limit !== undefined && isNaN(limit))
        return res
          .status(400)
          .json({
            code: 'VALIDATION_ERROR',
            message: 'limit must be a positive integer',
            correlationId: req.correlationId,
          });
      const page = await ctx.pipelines.findByWorkspaceId(req.params['id']!, { cursor, limit });
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
        return res
          .status(400)
          .json({
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
        return res
          .status(400)
          .json({
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
        inputSchemaJson: body.inputSchemaJson,
        outputSchemaJson: body.outputSchemaJson,
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
          return res
            .status(400)
            .json({
              code: 'VALIDATION_ERROR',
              message: dagResult.errors.join('; '),
              errors: dagResult.errors,
              correlationId: req.correlationId,
            });
        }
      }

      const updated = await ctx.pipelines.update(pipeline.id, {
        name,
        description,
        pipelineDefinitionJson,
        isActive,
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

export default router;
