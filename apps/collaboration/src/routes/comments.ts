import { Router, type Router as RouterType } from 'express';
import { authMiddleware, requirePermission } from '@udd/auth';
import { PgProjectRepository, PgCommentRepository } from '@udd/database';

const router: RouterType = Router();
router.use(authMiddleware);

const projects = new PgProjectRepository();
const comments = new PgCommentRepository();

router.get('/projects/:id/comments', requirePermission('comment.read'), async (req, res, next) => {
  try {
    const project = await projects.findById(req.params['id']!);
    if (!project)
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });

    const hasAccess = await projects.isAccessibleByUser(project.id, req.auth!.userId);
    if (!hasAccess)
      return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });

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
    const opts: { cursor?: string; limit?: number } = {};
    if (cursor !== undefined) opts.cursor = cursor;
    if (limit !== undefined) opts.limit = limit;
    const page = await comments.findThreadsByProjectId(project.id, opts);

    return res.json({
      data: page.items,
      nextCursor: page.nextCursor,
      hasMore: page.hasMore,
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

      if (!body)
        return res
          .status(400)
          .json({
            code: 'VALIDATION_ERROR',
            message: 'body is required',
            correlationId: req.correlationId,
          });

      const project = await projects.findById(req.params['id']!);
      if (!project)
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });

      const hasAccess = await projects.isAccessibleByUser(project.id, req.auth!.userId);
      if (!hasAccess)
        return res.status(404).json({ code: 'NOT_FOUND', correlationId: req.correlationId });

      let resolvedThreadId = threadId;
      if (!resolvedThreadId) {
        const thread = await comments.createThread({
          projectId: project.id,
          anchor: anchor ?? { type: 'general' },
        });
        resolvedThreadId = thread.id;
      }

      const comment = await comments.createComment({
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
