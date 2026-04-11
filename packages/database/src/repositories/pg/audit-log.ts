import type { AuditLog } from '@udd/contracts';
import type { AuditLogRepository, PageOptions, Page } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';
import { encodeCursor, decodeCursor, buildCursorClause, DEFAULT_PAGE_LIMIT } from './cursor.js';

function rowToAuditLog(row: Record<string, unknown>): AuditLog {
  return {
    id: row['id'] as string,
    workspaceId: row['workspace_id'] as string,
    actorUserId: row['actor_user_id'] as string,
    action: row['action'] as string,
    resourceType: row['resource_type'] as string,
    resourceId: row['resource_id'] as string,
    metadata: row['metadata'] as Record<string, unknown>,
    timestamp: (row['timestamp'] as Date).toISOString(),
  };
}

export class PgAuditLogRepository implements AuditLogRepository {
  async append(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    await queryOne<Record<string, unknown>>(
      `INSERT INTO audit_logs
         (workspace_id, actor_user_id, action, resource_type, resource_id, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        entry.workspaceId,
        entry.actorUserId,
        entry.action,
        entry.resourceType,
        entry.resourceId,
        JSON.stringify(entry.metadata),
      ],
    );
  }

  async findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<AuditLog>> {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;

    // audit_logs uses (timestamp, id) keyset — adapt buildCursorClause manually
    let clause = '';
    let params: unknown[] = [workspaceId];

    if (cursor) {
      clause = `AND (timestamp < $2 OR (timestamp = $2 AND id < $3))`;
      params = [workspaceId, cursor.created_at, cursor.id];
    }

    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM audit_logs
       WHERE workspace_id = $1 ${clause}
       ORDER BY timestamp DESC, id DESC
       LIMIT $${params.length + 1}`,
      [...params, limit + 1],
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToAuditLog);
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1]!.id, items[items.length - 1]!.timestamp)
        : null;

    return { items, nextCursor, hasMore };
  }
}
