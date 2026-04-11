import type { Project } from '@udd/contracts';
import type { ProjectRepository, PageOptions, Page } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';
import { encodeCursor, decodeCursor, buildCursorClause, DEFAULT_PAGE_LIMIT } from './cursor.js';

function rowToProject(row: Record<string, unknown>): Project {
  return {
    id: row['id'] as string,
    workspaceId: row['workspace_id'] as string,
    name: row['name'] as string,
    slug: row['slug'] as string,
    description: (row['description'] as string | null) ?? null,
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
    deletedAt: row['deleted_at'] ? (row['deleted_at'] as Date).toISOString() : null,
  };
}

export class PgProjectRepository implements ProjectRepository {
  async create(data: {
    workspaceId: string;
    name: string;
    slug: string;
    description?: string;
  }): Promise<Project> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO projects (workspace_id, name, slug, description)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.workspaceId, data.name, data.slug, data.description ?? null],
    );
    if (!row) throw new Error('Insert returned no rows');
    return rowToProject(row);
  }

  async findById(id: string): Promise<Project | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM projects WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return row ? rowToProject(row) : null;
  }

  async findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<Project>> {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;
    const { clause, params: cursorParams } = buildCursorClause(cursor, [workspaceId]);

    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM projects
       WHERE workspace_id = $1 AND deleted_at IS NULL ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${cursorParams.length + 1}`,
      [...cursorParams, limit + 1],
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToProject);
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1]!.id, items[items.length - 1]!.createdAt)
        : null;

    return { items, nextCursor, hasMore };
  }

  async update(
    id: string,
    data: Partial<Pick<Project, 'name' | 'description'>>,
  ): Promise<Project | null> {
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE projects
       SET name        = COALESCE($2, name),
           description = COALESCE($3, description),
           updated_at  = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id, data.name ?? null, data.description ?? null],
    );
    return row ? rowToProject(row) : null;
  }

  async softDelete(id: string): Promise<void> {
    await queryOne<Record<string, unknown>>(
      `UPDATE projects SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
  }
}
