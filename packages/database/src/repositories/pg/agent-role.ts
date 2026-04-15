import type { AgentRole } from '@udd/contracts';
import type { AgentRoleRepository, PageOptions, Page } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';
import { encodeCursor, decodeCursor, buildCursorClause, DEFAULT_PAGE_LIMIT } from './cursor.js';

function rowToAgentRole(row: Record<string, unknown>): AgentRole {
  return {
    id: row['id'] as string,
    workspaceId: row['workspace_id'] as string,
    projectId: (row['project_id'] as string | null) ?? null,
    createdByUserId: row['created_by_user_id'] as string,
    name: row['name'] as string,
    description: (row['description'] as string | null) ?? null,
    providerConfigId: row['provider_config_id'] as string,
    modelIdentifier: row['model_identifier'] as string,
    endpointOverrideUrl: (row['endpoint_override_url'] as string | null) ?? null,
    systemInstructionsRef: (row['system_instructions_ref'] as string | null) ?? null,
    roleConfigJson: row['role_config_json'] as Record<string, unknown>,
    isActive: row['is_active'] as boolean,
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
  };
}

export class PgAgentRoleRepository implements AgentRoleRepository {
  async create(data: Omit<AgentRole, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentRole> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO agent_roles
         (workspace_id, project_id, created_by_user_id, name, description, provider_config_id,
          model_identifier, endpoint_override_url, system_instructions_ref,
          role_config_json, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        data.workspaceId,
        data.projectId ?? null,
        data.createdByUserId,
        data.name,
        data.description ?? null,
        data.providerConfigId,
        data.modelIdentifier,
        data.endpointOverrideUrl ?? null,
        data.systemInstructionsRef ?? null,
        JSON.stringify(data.roleConfigJson),
        data.isActive,
      ],
    );
    if (!row) throw new Error('Insert returned no rows');
    return rowToAgentRole(row);
  }

  async findById(id: string): Promise<AgentRole | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM agent_roles WHERE id = $1',
      [id],
    );
    return row ? rowToAgentRole(row) : null;
  }

  async findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<AgentRole>> {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;
    const { clause, params: cursorParams } = buildCursorClause(cursor, [workspaceId]);

    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM agent_roles
       WHERE workspace_id = $1 ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${cursorParams.length + 1}`,
      [...cursorParams, limit + 1],
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToAgentRole);
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1]!.id, items[items.length - 1]!.createdAt)
        : null;

    return { items, nextCursor, hasMore };
  }

  async findByProjectId(projectId: string, options?: PageOptions): Promise<Page<AgentRole>> {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;
    const { clause, params: cursorParams } = buildCursorClause(cursor, [projectId]);

    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM agent_roles
       WHERE project_id = $1 ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${cursorParams.length + 1}`,
      [...cursorParams, limit + 1],
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToAgentRole);
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1]!.id, items[items.length - 1]!.createdAt)
        : null;

    return { items, nextCursor, hasMore };
  }

  async update(
    id: string,
    data: Partial<
      Pick<
        AgentRole,
        | 'name'
        | 'description'
        | 'modelIdentifier'
        | 'endpointOverrideUrl'
        | 'roleConfigJson'
        | 'isActive'
      >
    >,
  ): Promise<AgentRole | null> {
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE agent_roles
       SET name                  = COALESCE($2, name),
           description           = COALESCE($3, description),
           model_identifier      = COALESCE($4, model_identifier),
           endpoint_override_url = COALESCE($5, endpoint_override_url),
           role_config_json      = COALESCE($6, role_config_json),
           is_active             = COALESCE($7, is_active),
           updated_at            = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.name ?? null,
        data.description ?? null,
        data.modelIdentifier ?? null,
        data.endpointOverrideUrl ?? null,
        data.roleConfigJson != null ? JSON.stringify(data.roleConfigJson) : null,
        data.isActive ?? null,
      ],
    );
    return row ? rowToAgentRole(row) : null;
  }

  async delete(id: string): Promise<void> {
    await queryOne<Record<string, unknown>>('DELETE FROM agent_roles WHERE id = $1', [id]);
  }
}
