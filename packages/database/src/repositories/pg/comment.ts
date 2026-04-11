import type { CollaborationThread, Comment } from '@udd/contracts';
import type { CommentRepository, PageOptions, Page } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';
import { encodeCursor, decodeCursor, buildCursorClause, DEFAULT_PAGE_LIMIT } from './cursor.js';

function rowToThread(row: Record<string, unknown>): CollaborationThread {
  return {
    id: row['id'] as string,
    projectId: row['project_id'] as string,
    sessionId: (row['session_id'] as string | null) ?? null,
    anchor: row['anchor'] as CollaborationThread['anchor'],
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
  };
}

function rowToComment(row: Record<string, unknown>): Comment {
  return {
    id: row['id'] as string,
    threadId: row['thread_id'] as string,
    authorUserId: row['author_user_id'] as string,
    body: row['body'] as string,
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
    deletedAt: row['deleted_at'] ? (row['deleted_at'] as Date).toISOString() : null,
  };
}

export class PgCommentRepository implements CommentRepository {
  async createThread(data: {
    projectId: string;
    sessionId?: string;
    anchor: CollaborationThread['anchor'];
  }): Promise<CollaborationThread> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO collaboration_threads (project_id, session_id, anchor)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.projectId, data.sessionId ?? null, JSON.stringify(data.anchor)],
    );
    if (!row) throw new Error('Insert returned no rows');
    return rowToThread(row);
  }

  async findThreadsByProjectId(
    projectId: string,
    options?: PageOptions,
  ): Promise<Page<CollaborationThread>> {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;
    const { clause, params: cursorParams } = buildCursorClause(cursor, [projectId]);

    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM collaboration_threads
       WHERE project_id = $1 ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${cursorParams.length + 1}`,
      [...cursorParams, limit + 1],
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToThread);
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1]!.id, items[items.length - 1]!.createdAt)
        : null;

    return { items, nextCursor, hasMore };
  }

  async createComment(data: Pick<Comment, 'threadId' | 'authorUserId' | 'body'>): Promise<Comment> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO comments (thread_id, author_user_id, body)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.threadId, data.authorUserId, data.body],
    );
    if (!row) throw new Error('Insert returned no rows');
    return rowToComment(row);
  }

  async findCommentsByThreadId(threadId: string): Promise<Comment[]> {
    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM comments
       WHERE thread_id = $1 AND deleted_at IS NULL
       ORDER BY created_at ASC`,
      [threadId],
    );
    return rows.map(rowToComment);
  }

  async softDeleteComment(id: string): Promise<void> {
    await queryOne<Record<string, unknown>>(
      `UPDATE comments SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
  }
}
