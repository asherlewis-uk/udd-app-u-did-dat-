import { Router } from 'express';
import { authMiddleware, requirePermission } from '@udd/auth';
import type { PlatformEvent } from '@udd/contracts';
import { getContext } from '../context.js';

const router = Router();
router.use(authMiddleware);

async function assertMember(ctx: ReturnType<typeof getContext>, userId: string, workspaceId: string) {
  return ctx.memberships.findByUserAndWorkspace(userId, workspaceId);
}

// POST /workspaces/:id/ai/pipelines/:pipelineId/runs
router.post('/workspaces/:id/ai/pipelines/:pipelineId/runs', requirePermission('ai.pipeline.execute'), async (req, res, next) => {
  try {
    const ctx = getContext();
    if (!await assertMember(ctx, req.auth!.userId, req.params['id']!)) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }

    const pipeline = await ctx.pipelines.findById(req.params['pipelineId']!);
    if (!pipeline || pipeline.workspaceId !== req.params['id']!) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Pipeline not found', correlationId: req.correlationId });
    }
    if (!pipeline.isActive) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'Pipeline is not active', correlationId: req.correlationId });
    }

    const { inputPayloadRef, idempotencyKey } = req.body as {
      inputPayloadRef?: string;
      idempotencyKey?: string;
    };

    // Idempotency check
    if (idempotencyKey) {
      const existing = await ctx.pipelineRuns.findByIdempotencyKey(pipeline.id, idempotencyKey);
      if (existing) {
        return res.status(200).json({
          data: existing,
          meta: { idempotent: true },
          correlationId: req.correlationId,
        });
      }
    }

    const run = await ctx.pipelineRuns.create({
      workspaceId: req.params['id']!,
      projectId: pipeline.projectId ?? null,
      pipelineId: pipeline.id,
      triggeredByUserId: req.auth!.userId,
      sourceType: 'manual',
      status: 'queued',
      inputPayloadRef: inputPayloadRef ?? null,
      outputPayloadRef: null,
      errorSummary: null,
      startedAt: null,
      finishedAt: null,
      idempotencyKey,
    } as Parameters<typeof ctx.pipelineRuns.create>[0]);

    await ctx.auditLogs.append({
      workspaceId: req.params['id']!,
      actorUserId: req.auth!.userId,
      action: 'ai.pipeline.run.created',
      resourceType: 'pipeline_run',
      resourceId: run.id,
      metadata: { pipelineId: pipeline.id },
    });

    // Publish event to trigger async execution
    await ctx.events.publish({
      topic: 'ai.pipeline.run.queued',
      payload: {
        pipelineRunId: run.id,
        pipelineId: pipeline.id,
        workspaceId: req.params['id']!,
      },
      correlationId: req.correlationId ?? 'unknown',
      timestamp: new Date().toISOString(),
    } as PlatformEvent);

    return res.status(202).json({ data: run, correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

// GET /workspaces/:id/ai/runs
router.get('/workspaces/:id/ai/runs', requirePermission('ai.run.read'), async (req, res, next) => {
  try {
    const ctx = getContext();
    if (!await assertMember(ctx, req.auth!.userId, req.params['id']!)) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }
    const cursor = req.query['cursor'] as string | undefined;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
    if (limit !== undefined && isNaN(limit)) return res.status(400).json({ code: 'VALIDATION_ERROR', message: 'limit must be a positive integer', correlationId: req.correlationId });
    const page = await ctx.pipelineRuns.findByWorkspaceId(req.params['id']!, { cursor, limit });
    return res.json({ data: page.items, meta: { nextCursor: page.nextCursor, hasMore: page.hasMore }, correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

// GET /workspaces/:id/ai/runs/:pipelineRunId
router.get('/workspaces/:id/ai/runs/:pipelineRunId', requirePermission('ai.run.read'), async (req, res, next) => {
  try {
    const ctx = getContext();
    if (!await assertMember(ctx, req.auth!.userId, req.params['id']!)) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }
    const run = await ctx.pipelineRuns.findById(req.params['pipelineRunId']!);
    if (!run || run.workspaceId !== req.params['id']!) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }
    return res.json({ data: run, correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

// POST /workspaces/:id/ai/runs/:pipelineRunId/cancel
router.post('/workspaces/:id/ai/runs/:pipelineRunId/cancel', requirePermission('ai.run.cancel'), async (req, res, next) => {
  try {
    const ctx = getContext();
    if (!await assertMember(ctx, req.auth!.userId, req.params['id']!)) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }

    const run = await ctx.pipelineRuns.findById(req.params['pipelineRunId']!);
    if (!run || run.workspaceId !== req.params['id']!) {
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });
    }

    if (!['queued', 'preparing', 'running'].includes(run.status)) {
      return res.status(409).json({
        code: 'INVALID_STATE',
        message: `Cannot cancel run in status '${run.status}'`,
        correlationId: req.correlationId,
      });
    }

    const cancelled = await ctx.pipelineRuns.updateStatus(run.id, 'canceled', {
      finishedAt: new Date().toISOString(),
      errorSummary: 'Cancelled by user',
    });

    await ctx.auditLogs.append({
      workspaceId: req.params['id']!,
      actorUserId: req.auth!.userId,
      action: 'ai.pipeline.run.cancelled',
      resourceType: 'pipeline_run',
      resourceId: run.id,
      metadata: {},
    });

    await ctx.events.publish({
      topic: 'ai.pipeline.run.cancelled',
      payload: { pipelineRunId: run.id, workspaceId: req.params['id']! },
      correlationId: req.correlationId ?? 'unknown',
      timestamp: new Date().toISOString(),
    } as PlatformEvent);

    return res.json({ data: cancelled, correlationId: req.correlationId });
  } catch (err) { return next(err); }
});

export default router;
