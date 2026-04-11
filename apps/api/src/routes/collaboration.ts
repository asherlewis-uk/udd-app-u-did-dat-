import { Router } from 'express';
import { requirePermission } from '@udd/auth';
import { getContext } from '../context.js';
import { createAppError } from '../middleware/error.js';

const router: Router = Router();

// -------------------------------------------------------
// Threads + comments scoped to a project
// -------------------------------------------------------

router.get('/projects/:id/comments', requirePermission('comment.read'), async (req, res, next) => {
  try {
    const ctx = getContext();

    const project = await ctx.projects.findById(req.params['id']!);
    if (!project) return next(createAppError('Project not found', 404, 'NOT_FOUND'));

    const membership = await ctx.memberships.findByUserAndWorkspace(
      req.auth!.userId,
      project.workspaceId,
    );
    if (!membership) return next(createAppError('Project not found', 404, 'NOT_FOUND'));

    const cursor = req.query['cursor'] as string | undefined;
    const limit = req.query['limit'] ? parseInt(req.query['limit'] as string, 10) : undefined;
    if (limit !== undefined && isNaN(limit))
      return next(createAppError('limit must be a positive integer', 400, 'VALIDATION_ERROR'));
    const pageOpts: { cursor?: string; limit?: number } = {};
    if (cursor !== undefined) pageOpts.cursor = cursor;
    if (limit !== undefined) pageOpts.limit = limit;
    const page = await ctx.comments.findThreadsByProjectId(project.id, pageOpts);

    return res.json({
      data: page.items,
      meta: { nextCursor: page.nextCursor, hasMore: page.hasMore },
      correlationId: req.correlationId,
    });
  } catch (err) {
    return next(err);
  }
});

router.post(
  '/projects/:id/comments',
  requirePermission('comment.create'),
  async (req, res, next) => {
    try {
      const { threadId, body, anchor } = req.body as {
        threadId?: string;
        body?: string;
        anchor?: { type: 'file' | 'preview' | 'general'; path?: string; line?: number };
      };

      if (!body) {
        return next(createAppError('body is required', 400, 'VALIDATION_ERROR'));
      }

      const ctx = getContext();

      const project = await ctx.projects.findById(req.params['id']!);
      if (!project) return next(createAppError('Project not found', 404, 'NOT_FOUND'));

      const membership = await ctx.memberships.findByUserAndWorkspace(
        req.auth!.userId,
        project.workspaceId,
      );
      if (!membership) return next(createAppError('Project not found', 404, 'NOT_FOUND'));

      // If no threadId, create a new thread first
      let resolvedThreadId = threadId;
      if (!resolvedThreadId) {
        const thread = await ctx.comments.createThread({
          projectId: project.id,
          anchor: anchor ?? { type: 'general' },
        });
        resolvedThreadId = thread.id;
      }

      const comment = await ctx.comments.createComment({
        threadId: resolvedThreadId,
        authorUserId: req.auth!.userId,
        body,
      });

      return res.status(201).json({ data: comment, correlationId: req.correlationId });
    } catch (err) {
      return next(err);
    }
  },
);

export default router;
