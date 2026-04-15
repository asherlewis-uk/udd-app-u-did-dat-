import type { PipelineRunRecord, PipelineRunStatus } from '@udd/contracts';
import type { PipelineRunRepository, PageOptions, Page } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';
import { encodeCursor, decodeCursor, buildCursorClause, DEFAULT_PAGE_LIMIT } from './cursor.js';

function rowToRun(row: Record<string, unknown>): PipelineRunRecord {
  return {
    id: row['id'] as string,
    workspaceId: row['workspace_id'] as string,
    projectId: (row['project_id'] as string | null) ?? null,
    pipelineId: row['pipeline_id'] as string,
    triggeredByUserId: row['triggered_by_user_id'] as string,
    sourceType: row['source_type'] as PipelineRunRecord['sourceType'],
    status: row['status'] as PipelineRunStatus,
    inputPayloadRef: (row['input_payload_ref'] as string | null) ?? null,
    outputPayloadRef: (row['output_payload_ref'] as string | null) ?? null,
    errorSummary: (row['error_summary'] as string | null) ?? null,
    startedAt: row['started_at'] ? (row['started_at'] as Date).toISOString() : null,
    finishedAt: row['finished_at'] ? (row['finished_at'] as Date).toISOString() : null,
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
  };
}

export class PgPipelineRunRepository implements PipelineRunRepository {
  async create(
    data: Omit<PipelineRunRecord, 'id' | 'createdAt' | 'updatedAt'> & { idempotencyKey?: string },
  ): Promise<PipelineRunRecord> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO pipeline_runs
         (workspace_id, project_id, pipeline_id, triggered_by_user_id, source_type,
          status, input_payload_ref, output_payload_ref, error_summary,
          idempotency_key, started_at, finished_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING *`,
      [
        data.workspaceId,
        data.projectId ?? null,
        data.pipelineId,
        data.triggeredByUserId,
        data.sourceType,
        data.status,
        data.inputPayloadRef ?? null,
        data.outputPayloadRef ?? null,
        data.errorSummary ?? null,
        (data as { idempotencyKey?: string }).idempotencyKey ?? null,
        data.startedAt ?? null,
        data.finishedAt ?? null,
      ],
    );
    if (!row) throw new Error('Insert returned no rows');
    return rowToRun(row);
  }

  async findById(id: string): Promise<PipelineRunRecord | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM pipeline_runs WHERE id = $1',
      [id],
    );
    return row ? rowToRun(row) : null;
  }

  async findByIdempotencyKey(
    pipelineId: string,
    key: string,
  ): Promise<PipelineRunRecord | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM pipeline_runs WHERE pipeline_id = $1 AND idempotency_key = $2`,
      [pipelineId, key],
    );
    return row ? rowToRun(row) : null;
  }

  async findByWorkspaceId(
    workspaceId: string,
    options?: PageOptions,
  ): Promise<Page<PipelineRunRecord>> {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;
    const { clause, params: cursorParams } = buildCursorClause(cursor, [workspaceId]);

    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM pipeline_runs
       WHERE workspace_id = $1 ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${cursorParams.length + 1}`,
      [...cursorParams, limit + 1],
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToRun);
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1]!.id, items[items.length - 1]!.createdAt)
        : null;

    return { items, nextCursor, hasMore };
  }

  async findByProjectId(
    projectId: string,
    options?: PageOptions,
  ): Promise<Page<PipelineRunRecord>> {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;
    const { clause, params: cursorParams } = buildCursorClause(cursor, [projectId]);

    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM pipeline_runs
       WHERE project_id = $1 ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${cursorParams.length + 1}`,
      [...cursorParams, limit + 1],
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToRun);
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1]!.id, items[items.length - 1]!.createdAt)
        : null;

    return { items, nextCursor, hasMore };
  }

  async updateStatus(
    id: string,
    status: PipelineRunStatus,
    extraFields?: Partial<
      Pick<PipelineRunRecord, 'outputPayloadRef' | 'errorSummary' | 'startedAt' | 'finishedAt'>
    >,
  ): Promise<PipelineRunRecord> {
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE pipeline_runs
       SET status             = $2,
           output_payload_ref = COALESCE($3, output_payload_ref),
           error_summary      = COALESCE($4, error_summary),
           started_at         = COALESCE($5, started_at),
           finished_at        = COALESCE($6, finished_at),
           updated_at         = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        id,
        status,
        extraFields?.outputPayloadRef ?? null,
        extraFields?.errorSummary ?? null,
        extraFields?.startedAt ?? null,
        extraFields?.finishedAt ?? null,
      ],
    );
    if (!row) throw new Error(`Pipeline run ${id} not found`);
    return rowToRun(row);
  }

  async findStuck(
    preparingTimeoutMs: number,
    runningTimeoutMs: number,
  ): Promise<PipelineRunRecord[]> {
    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM pipeline_runs
       WHERE
         (status = 'preparing' AND updated_at < NOW() - ($1 || ' milliseconds')::INTERVAL)
         OR
         (status = 'running'   AND updated_at < NOW() - ($2 || ' milliseconds')::INTERVAL)`,
      [preparingTimeoutMs, runningTimeoutMs],
    );
    return rows.map(rowToRun);
  }
}
