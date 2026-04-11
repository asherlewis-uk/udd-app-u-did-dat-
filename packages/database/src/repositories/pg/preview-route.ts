import type { PoolClient } from 'pg';
import type { PreviewRouteBinding, PreviewRouteState } from '@udd/contracts';
import type { PreviewRouteRepository } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';
import { OptimisticConcurrencyError } from './session.js';

function rowToBinding(row: Record<string, unknown>): PreviewRouteBinding {
  return {
    id: row['id'] as string,
    previewId: row['preview_id'] as string,
    sessionId: row['session_id'] as string,
    projectId: row['project_id'] as string,
    workspaceId: row['workspace_id'] as string,
    workerHost: row['worker_host'] as string,
    hostPort: row['host_port'] as number,
    state: row['state'] as PreviewRouteState,
    boundAt: (row['bound_at'] as Date).toISOString(),
    expiresAt: row['expires_at'] ? (row['expires_at'] as Date).toISOString() : null,
    revokedAt: row['revoked_at'] ? (row['revoked_at'] as Date).toISOString() : null,
    version: row['version'] as number,
  };
}

export class PgPreviewRouteRepository implements PreviewRouteRepository {
  async create(data: {
    previewId: string;
    sessionId: string;
    projectId: string;
    workspaceId: string;
    workerHost: string;
    hostPort: number;
    ttlSeconds?: number;
  }): Promise<PreviewRouteBinding> {
    const expiresAt =
      data.ttlSeconds != null
        ? new Date(Date.now() + data.ttlSeconds * 1000).toISOString()
        : null;

    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO preview_routes
         (preview_id, session_id, project_id, workspace_id, worker_host, host_port, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        data.previewId,
        data.sessionId,
        data.projectId,
        data.workspaceId,
        data.workerHost,
        data.hostPort,
        expiresAt,
      ],
    );
    if (!row) throw new Error('Insert returned no rows');
    return rowToBinding(row);
  }

  async findByPreviewId(previewId: string): Promise<PreviewRouteBinding | null> {
    const row = await queryOne<Record<string, unknown>>(
      'SELECT * FROM preview_routes WHERE preview_id = $1',
      [previewId],
    );
    return row ? rowToBinding(row) : null;
  }

  async findActiveBySessionId(sessionId: string): Promise<PreviewRouteBinding[]> {
    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM preview_routes
       WHERE session_id = $1 AND state = 'active'
       ORDER BY bound_at ASC`,
      [sessionId],
    );
    return rows.map(rowToBinding);
  }

  async updateState(
    id: string,
    toState: PreviewRouteState,
    expectedVersion: number,
  ): Promise<PreviewRouteBinding> {
    const revokedAt = toState === 'revoked' ? 'NOW()' : 'revoked_at';
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE preview_routes
       SET state      = $3,
           version    = version + 1,
           revoked_at = ${revokedAt}
       WHERE id = $1 AND version = $2
       RETURNING *`,
      [id, expectedVersion, toState],
    );
    if (!row) throw new OptimisticConcurrencyError('preview_route', id);
    return rowToBinding(row);
  }

  /**
   * Bulk-revoke all active preview routes for a session.
   * Accepts an optional PoolClient so the UPDATE participates in the stopSession
   * transaction — if the subsequent session state update fails, the revocations
   * roll back atomically (H-1 / M-2 fix).
   */
  async revokeAllForSession(sessionId: string, client?: PoolClient): Promise<void> {
    await queryMany<Record<string, unknown>>(
      `UPDATE preview_routes
       SET state      = 'revoked',
           revoked_at = NOW(),
           version    = version + 1
       WHERE session_id = $1 AND state NOT IN ('revoked', 'expired')`,
      [sessionId],
      client,
    );
  }
}
