import type { PoolClient } from 'pg';
import type { Session, SessionState } from '@udd/contracts';
import type { SessionRepository, PageOptions, Page } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';
import { encodeCursor, decodeCursor, buildCursorClause, DEFAULT_PAGE_LIMIT } from './cursor.js';

export class OptimisticConcurrencyError extends Error {
  constructor(resourceType: string, id: string) {
    super(`Optimistic concurrency conflict on ${resourceType} ${id}`);
    this.name = 'OptimisticConcurrencyError';
  }
}

function rowToSession(row: Record<string, unknown>): Session {
  return {
    id: row['id'] as string,
    projectId: row['project_id'] as string,
    workspaceId: row['workspace_id'] as string,
    userId: row['user_id'] as string,
    state: row['state'] as SessionState,
    workerHost: (row['worker_host'] as string | null) ?? null,
    hostPort: (row['host_port'] as number | null) ?? null,
    startedAt: row['started_at'] ? (row['started_at'] as Date).toISOString() : null,
    stoppedAt: row['stopped_at'] ? (row['stopped_at'] as Date).toISOString() : null,
    lastActivityAt: row['last_activity_at']
      ? (row['last_activity_at'] as Date).toISOString()
      : null,
    idleTimeoutSeconds: row['idle_timeout_seconds'] as number,
    version: row['version'] as number,
    createdAt: (row['created_at'] as Date).toISOString(),
    updatedAt: (row['updated_at'] as Date).toISOString(),
  };
}

export class PgSessionRepository implements SessionRepository {
  async create(data: {
    projectId: string;
    workspaceId: string;
    userId: string;
    idleTimeoutSeconds?: number;
  }): Promise<Session> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO sessions (project_id, workspace_id, user_id, idle_timeout_seconds)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.projectId, data.workspaceId, data.userId, data.idleTimeoutSeconds ?? 1800],
    );
    if (!row) throw new Error('Insert returned no rows');
    return rowToSession(row);
  }

  async findById(id: string): Promise<Session | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM sessions WHERE id = $1',
      [id],
    );
    return row ? rowToSession(row) : null;
  }

  /**
   * Lock the session row for the duration of the current transaction.
   * Must be called inside a withTransaction() block.
   * Prevents concurrent startSession / stopSession calls from racing on
   * the same session row.
   */
  async findByIdForUpdate(id: string, client: PoolClient): Promise<Session | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM sessions WHERE id = $1 FOR UPDATE',
      [id],
      client,
    );
    return row ? rowToSession(row) : null;
  }

  async findByProjectId(projectId: string, options?: PageOptions): Promise<Page<Session>> {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;
    const { clause, params: cursorParams } = buildCursorClause(cursor, [projectId]);

    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM sessions
       WHERE project_id = $1 ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${cursorParams.length + 1}`,
      [...cursorParams, limit + 1],
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToSession);
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1]!.id, items[items.length - 1]!.createdAt)
        : null;

    return { items, nextCursor, hasMore };
  }

  async findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<Session>> {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;
    const { clause, params: cursorParams } = buildCursorClause(cursor, [workspaceId]);

    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM sessions
       WHERE workspace_id = $1 ${clause}
       ORDER BY created_at DESC, id DESC
       LIMIT $${cursorParams.length + 1}`,
      [...cursorParams, limit + 1],
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToSession);
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1]!.id, items[items.length - 1]!.createdAt)
        : null;

    return { items, nextCursor, hasMore };
  }

  /**
   * Optimistic concurrency state update.
   * Accepts an optional PoolClient so the UPDATE can participate in a
   * caller-managed transaction (e.g. the startSession / stopSession flows).
   * Throws OptimisticConcurrencyError when the version guard misses.
   */
  async updateState(
    id: string,
    toState: SessionState,
    expectedVersion: number,
    extraFields?: Partial<
      Pick<Session, 'workerHost' | 'hostPort' | 'startedAt' | 'stoppedAt' | 'lastActivityAt'>
    >,
    client?: PoolClient,
  ): Promise<Session> {
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE sessions
       SET state            = $3,
           version          = version + 1,
           worker_host      = COALESCE($4, worker_host),
           host_port        = COALESCE($5, host_port),
           started_at       = COALESCE($6, started_at),
           stopped_at       = COALESCE($7, stopped_at),
           last_activity_at = COALESCE($8, last_activity_at),
           updated_at       = NOW()
       WHERE id = $1 AND version = $2
       RETURNING *`,
      [
        id,
        expectedVersion,
        toState,
        extraFields?.workerHost ?? null,
        extraFields?.hostPort ?? null,
        extraFields?.startedAt ?? null,
        extraFields?.stoppedAt ?? null,
        extraFields?.lastActivityAt ?? null,
      ],
      client,
    );
    if (!row) throw new OptimisticConcurrencyError('session', id);
    return rowToSession(row);
  }

  async findIdleBeyond(idleThresholdSeconds: number): Promise<Session[]> {
    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM sessions
       WHERE state = 'running'
         AND last_activity_at < NOW() - ($1 || ' seconds')::INTERVAL`,
      [idleThresholdSeconds],
    );
    return rows.map(rowToSession);
  }

  /**
   * Atomically stop an idle session — re-checks last_activity_at inside the
   * UPDATE so a user who resumes between the findIdleBeyond scan and this call
   * is never incorrectly reaped (H-3 fix).
   *
   * Returns the updated Session if the row matched all conditions, or null if
   * the session was no longer idle (activity resumed) or the version changed.
   */
  async stopIdleSession(
    id: string,
    expectedVersion: number,
    idleThresholdSeconds: number,
  ): Promise<Session | null> {
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE sessions
       SET state      = 'stopping',
           version    = version + 1,
           stopped_at = NOW(),
           updated_at = NOW()
       WHERE id      = $1
         AND version = $2
         AND state   = 'running'
         AND last_activity_at < NOW() - ($3 || ' seconds')::INTERVAL
       RETURNING *`,
      [id, expectedVersion, idleThresholdSeconds],
    );
    return row ? rowToSession(row) : null;
  }
}
