import type { UsageMeterEvent } from '@udd/contracts';
import type { UsageMeterRepository, PageOptions, Page } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';
import { encodeCursor, decodeCursor, DEFAULT_PAGE_LIMIT } from './cursor.js';

function rowToEvent(row: Record<string, unknown>): UsageMeterEvent {
  return {
    id: row['id'] as string,
    workspaceId: row['workspace_id'] as string,
    eventType: row['event_type'] as string,
    resourceId: row['resource_id'] as string,
    quantity: row['quantity'] as number,
    unit: row['unit'] as string,
    metadata: row['metadata'] as Record<string, unknown>,
    recordedAt: (row['recorded_at'] as Date).toISOString(),
  };
}

export class PgUsageMeterRepository implements UsageMeterRepository {
  async record(event: Omit<UsageMeterEvent, 'id' | 'recordedAt'>): Promise<void> {
    await queryOne<Record<string, unknown>>(
      `INSERT INTO usage_meter_events
         (workspace_id, event_type, resource_id, quantity, unit, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        event.workspaceId,
        event.eventType,
        event.resourceId,
        event.quantity,
        event.unit,
        JSON.stringify(event.metadata),
      ],
    );
  }

  async findByWorkspaceId(
    workspaceId: string,
    options?: PageOptions,
  ): Promise<Page<UsageMeterEvent>> {
    const limit = options?.limit ?? DEFAULT_PAGE_LIMIT;
    const cursor = options?.cursor ? decodeCursor(options.cursor) : null;

    let clause = '';
    let params: unknown[] = [workspaceId];

    if (cursor) {
      clause = `AND (recorded_at < $2 OR (recorded_at = $2 AND id < $3))`;
      params = [workspaceId, cursor.created_at, cursor.id];
    }

    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM usage_meter_events
       WHERE workspace_id = $1 ${clause}
       ORDER BY recorded_at DESC, id DESC
       LIMIT $${params.length + 1}`,
      [...params, limit + 1],
    );

    const hasMore = rows.length > limit;
    const items = rows.slice(0, limit).map(rowToEvent);
    const nextCursor =
      hasMore && items.length > 0
        ? encodeCursor(items[items.length - 1]!.id, items[items.length - 1]!.recordedAt)
        : null;

    return { items, nextCursor, hasMore };
  }
}
