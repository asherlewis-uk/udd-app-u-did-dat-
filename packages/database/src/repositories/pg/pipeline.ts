import type { PipelineDefinition, PipelineDefinitionJson } from '@udd/contracts';
import type { PipelineRepository, PageOptions, Page } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';
import { encodeCursor, decodeCursor, buildCursorClause, DEFAULT_PAGE_LIMIT } from './cursor.js';

function rowToPipeline(row: Record<string, unknown>): PipelineDefinition {
  return {
    id: row['id'] as string,
    workspaceId: row['workspace_id'] as string,
    projectId: (row['project_id'] as string | null) ?? null,
    createdByUserId: row['created_by_user_id'] as string,
    name: row['name'] as string,
    description: (row['description'] as string | null) ?? null,
    pipelineVersion: row['pipeline_version'] as number,
    pipelineDefinitionJson: row['pipeline_definition_json'] as PipelineDefinitionJson,
    inputSchemaJson: (row['input_schema_json'] as Record<string, unknown> | null) ?? undefined,
    outputSchemaJson: (row['output_schema_json'] as Record<string, unknown> | null) ?? undefined,
    isActive: row['is_active'] as boolean,
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
  };
}

export class PgPipelineRepository implements PipelineRepository {
  async create(
    data: Omit<PipelineDefinition, 'id' | 'createdAt' | 'updatedAt' | 'pipelineVersion'>,
  ): Promise<PipelineDefinition> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO pipeline_definitions
         (workspace_id, project_id, created_by_user_id, name, description,
          pipeline_definition_json, input_schema_json, output_schema_json, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        data.workspaceId,
        data.projectId ?? null,
        data.createdByUserId,
        data.name,
        data.description ?? null,
        JSON.stringify(data.pipelineDefinitionJson),
        data.inputSchemaJson != null ? JSON.stringify(data.inputSchemaJson) : null,
        data.outputSchemaJson != null ? JSON.stringify(data.outputSchemaJson) : null,
        data.isActive,
      ],
    );
    if (!row) throw new Error('Insert returned no rows');
    return rowToPipeline(row);
  }

  async findById(id: string): Promise<PipelineDefinition | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM pipeline_definitions WHERE id = $1',
      [id],
    );
    return row ? rowToPipeline(row) : null;
  }

  async findByWorkspaceId(
    workspaceId: string,
    options?: PageOptions,
  ): Promise<Page<PipelineDefinition>> {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;
    const { clause, params: cursorParams } = buildCursorClause(cursor, [workspaceId]);

    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM pipeline_definitions
       WHERE workspace_id = $1 ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${cursorParams.length + 1}`,
      [...cursorParams, limit + 1],
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToPipeline);
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
        PipelineDefinition,
        'name' | 'description' | 'pipelineDefinitionJson' | 'isActive'
      >
    >,
  ): Promise<PipelineDefinition | null> {
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE pipeline_definitions
       SET name                    = COALESCE($2, name),
           description             = COALESCE($3, description),
           pipeline_definition_json = COALESCE($4, pipeline_definition_json),
           is_active               = COALESCE($5, is_active),
           pipeline_version        = pipeline_version + CASE WHEN $4 IS NOT NULL THEN 1 ELSE 0 END,
           updated_at              = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        data.name ?? null,
        data.description ?? null,
        data.pipelineDefinitionJson != null
          ? JSON.stringify(data.pipelineDefinitionJson)
          : null,
        data.isActive ?? null,
      ],
    );
    return row ? rowToPipeline(row) : null;
  }

  async delete(id: string): Promise<void> {
    await queryOne<Record<string, unknown>>(
      'DELETE FROM pipeline_definitions WHERE id = $1',
      [id],
    );
  }
}
