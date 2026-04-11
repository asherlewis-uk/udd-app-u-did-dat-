import type { PoolClient } from 'pg';
import type { WorkerCapacitySnapshot } from '@udd/contracts';
import type { WorkerCapacityRepository } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';

function rowToSnapshot(row: Record<string, unknown>): WorkerCapacitySnapshot {
  return {
    workerHost: row['worker_host'] as string,
    totalSlots: row['total_slots'] as number,
    usedSlots: row['used_slots'] as number,
    availablePorts: row['available_ports'] as number[],
    reportedAt: (row['reported_at'] as Date).toISOString(),
    healthy: row['healthy'] as boolean,
  };
}

export class PgWorkerCapacityRepository implements WorkerCapacityRepository {
  async upsertSnapshot(snapshot: WorkerCapacitySnapshot): Promise<void> {
    await queryOne<Record<string, unknown>>(
      `INSERT INTO worker_capacity_snapshots
         (worker_host, total_slots, used_slots, available_ports, reported_at, healthy)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (worker_host)
       DO UPDATE SET
         total_slots     = EXCLUDED.total_slots,
         used_slots      = EXCLUDED.used_slots,
         available_ports = EXCLUDED.available_ports,
         reported_at     = EXCLUDED.reported_at,
         healthy         = EXCLUDED.healthy`,
      [
        snapshot.workerHost,
        snapshot.totalSlots,
        snapshot.usedSlots,
        snapshot.availablePorts,
        snapshot.reportedAt,
        snapshot.healthy,
      ],
    );
  }

  async findAllHealthy(): Promise<WorkerCapacitySnapshot[]> {
    const rows = await queryMany<Record<string, unknown>>(
      `SELECT * FROM worker_capacity_snapshots
       WHERE healthy = TRUE
         AND reported_at > NOW() - INTERVAL '60 seconds'
       ORDER BY (total_slots - used_slots) DESC`,
      [],
    );
    return rows.map(rowToSnapshot);
  }

  async markUnhealthy(workerHost: string): Promise<void> {
    await queryOne<Record<string, unknown>>(
      `UPDATE worker_capacity_snapshots SET healthy = FALSE WHERE worker_host = $1`,
      [workerHost],
    );
  }

  /**
   * Select the best available worker and lock its row for the duration of the
   * calling transaction (L-6 / C-1 fix).
   *
   * `FOR UPDATE SKIP LOCKED` skips any row that another transaction has already
   * locked, so concurrent startSession calls serialise on different workers
   * instead of blocking each other.  Must be called inside withTransaction().
   *
   * Returns null when no healthy worker with free ports is available.
   */
  async findHealthyWithLock(client: PoolClient): Promise<WorkerCapacitySnapshot | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM worker_capacity_snapshots
       WHERE healthy = TRUE
         AND reported_at > NOW() - INTERVAL '60 seconds'
         AND array_length(available_ports, 1) > 0
       ORDER BY (total_slots - used_slots) DESC
       LIMIT 1
       FOR UPDATE SKIP LOCKED`,
      [],
      client,
    );
    return row ? rowToSnapshot(row) : null;
  }
}
