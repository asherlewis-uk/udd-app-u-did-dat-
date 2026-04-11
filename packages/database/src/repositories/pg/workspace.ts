import type { Workspace } from '@udd/contracts';
import type { WorkspaceRepository } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';

function rowToWorkspace(row: Record<string, unknown>): Workspace {
  return {
    id: row['id'] as string,
    organizationId: row['organization_id'] as string,
    name: row['name'] as string,
    slug: row['slug'] as string,
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
    deletedAt: row['deleted_at'] ? (row['deleted_at'] as Date).toISOString() : null,
  };
}

export class PgWorkspaceRepository implements WorkspaceRepository {
  async create(data: { organizationId: string; name: string; slug: string }): Promise<Workspace> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO workspaces (organization_id, name, slug)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.organizationId, data.name, data.slug],
    );
    if (!row) throw new Error('Insert returned no rows');
    return rowToWorkspace(row);
  }

  async findById(id: string): Promise<Workspace | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM workspaces WHERE id = $1 AND deleted_at IS NULL',
      [id],
    );
    return row ? rowToWorkspace(row) : null;
  }

  async findByOrganizationId(organizationId: string): Promise<Workspace[]> {
    const rows = await queryMany<Record<string, unknown>>(
      'SELECT * FROM workspaces WHERE organization_id = $1 AND deleted_at IS NULL ORDER BY created_at ASC',
      [organizationId],
    );
    return rows.map(rowToWorkspace);
  }

  async findByUserId(userId: string): Promise<Workspace[]> {
    const rows = await queryMany<Record<string, unknown>>(
      `SELECT w.* FROM workspaces w
       JOIN memberships m ON m.workspace_id = w.id
       WHERE m.user_id = $1 AND w.deleted_at IS NULL
       ORDER BY w.created_at ASC`,
      [userId],
    );
    return rows.map(rowToWorkspace);
  }

  async update(id: string, data: Partial<Pick<Workspace, 'name'>>): Promise<Workspace | null> {
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE workspaces
       SET name = COALESCE($2, name), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id, data.name ?? null],
    );
    return row ? rowToWorkspace(row) : null;
  }

  async softDelete(id: string): Promise<void> {
    await queryOne<Record<string, unknown>>(
      `UPDATE workspaces SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL`,
      [id],
    );
  }
}
