import type { Membership, MembershipRole } from '@udd/contracts';
import type { MembershipRepository, PageOptions, Page } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';
import { encodeCursor, decodeCursor, buildCursorClause, DEFAULT_PAGE_LIMIT } from './cursor.js';

function rowToMembership(row: Record<string, unknown>): Membership {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    workspaceId: row['workspace_id'] as string,
    role: row['role'] as MembershipRole,
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
  };
}

export class PgMembershipRepository implements MembershipRepository {
  async create(data: Pick<Membership, 'userId' | 'workspaceId' | 'role'>): Promise<Membership> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO memberships (user_id, workspace_id, role)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.userId, data.workspaceId, data.role],
    );
    if (!row) throw new Error('Insert returned no rows');
    return rowToMembership(row);
  }

  async findById(id: string): Promise<Membership | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM memberships WHERE id = $1',
      [id],
    );
    return row ? rowToMembership(row) : null;
  }

  async findByUserAndWorkspace(userId: string, workspaceId: string): Promise<Membership | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM memberships WHERE user_id = $1 AND workspace_id = $2',
      [userId, workspaceId],
    );
    return row ? rowToMembership(row) : null;
  }

  async findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<Membership>> {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;
    const { clause, params: cursorParams } = buildCursorClause(cursor, [workspaceId]);

    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM memberships
       WHERE workspace_id = $1 ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${cursorParams.length + 1}`,
      [...cursorParams, limit + 1],
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToMembership);
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1]!.id, items[items.length - 1]!.createdAt)
        : null;

    return { items, nextCursor, hasMore };
  }

  async updateRole(id: string, role: Membership['role']): Promise<Membership | null> {
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE memberships SET role = $2, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, role],
    );
    return row ? rowToMembership(row) : null;
  }

  async delete(id: string): Promise<void> {
    await queryOne<Record<string, unknown>>('DELETE FROM memberships WHERE id = $1', [id]);
  }
}
