import type { PoolClient } from 'pg';
import type { SandboxLease, LeaseState } from '@udd/contracts';
import type { SandboxLeaseRepository } from '../interfaces.js';
import { queryOne, queryMany } from '../../connection.js';
import { OptimisticConcurrencyError } from './session.js';

function rowToLease(row: Record<string, unknown>): SandboxLease {
  return {
    id: row['id'] as string,
    sessionId: row['session_id'] as string,
    workerHost: row['worker_host'] as string,
    hostPort: row['host_port'] as number,
    leaseState: row['lease_state'] as LeaseState,
    leasedAt: (row['leased_at'] as Date).toISOString(),
    expiresAt: (row['expires_at'] as Date).toISOString(),
    releasedAt: row['released_at'] ? (row['released_at'] as Date).toISOString() : null,
    version: row['version'] as number,
  };
}

export class PgSandboxLeaseRepository implements SandboxLeaseRepository {
  /**
   * Create a new sandbox lease.
   * Accepts an optional PoolClient so the INSERT participates in the
   * startSession transaction, rolling back atomically if the subsequent
   * session state update fails (H-2 fix).
   */
  async create(data: {
    sessionId: string;
    workerHost: string;
    hostPort: number;
    expiresAt: Date;
  }, client?: PoolClient): Promise<SandboxLease> {
    const row = await queryOne<Record<string, unknown>>(
      `INSERT INTO sandbox_leases (session_id, worker_host, host_port, expires_at)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.sessionId, data.workerHost, data.hostPort, data.expiresAt],
      client,
    );
    if (!row) throw new Error('Insert returned no rows');
    return rowToLease(row);
  }

  async findBySessionId(sessionId: string): Promise<SandboxLease | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM sandbox_leases WHERE session_id = $1
       ORDER BY leased_at DESC LIMIT 1`,
      [sessionId],
    );
    return row ? rowToLease(row) : null;
  }

  async findActiveByHostAndPort(
    workerHost: string,
    hostPort: number,
  ): Promise<SandboxLease | null> {
    const row = await queryOne<Record<string, unknown>>(
      `SELECT * FROM sandbox_leases
       WHERE worker_host = $1 AND host_port = $2 AND lease_state = 'active'`,
      [workerHost, hostPort],
    );
    return row ? rowToLease(row) : null;
  }

  async updateState(
    id: string,
    toState: LeaseState,
    expectedVersion: number,
  ): Promise<SandboxLease> {
    const releasedAt = toState === 'released' ? 'NOW()' : 'released_at';
    const row = await queryOne<Record<string, unknown>>(
      `UPDATE sandbox_leases
       SET lease_state  = $3,
           version      = version + 1,
           released_at  = ${releasedAt}
       WHERE id = $1 AND version = $2
       RETURNING *`,
      [id, expectedVersion, toState],
    );
    if (!row) throw new OptimisticConcurrencyError('sandbox_lease', id);
    return rowToLease(row);
  }

  async findOrphanedLeases(): Promise<SandboxLease[]> {
    const rows = await queryMany<Record<string, unknown>>(
      `SELECT sl.* FROM sandbox_leases sl
       LEFT JOIN sessions s ON s.id = sl.session_id
       WHERE sl.lease_state IN ('active', 'pending')
         AND (
           sl.expires_at < NOW()
           OR s.state IN ('stopped', 'failed')
           OR s.id IS NULL
         )`,
      [],
    );
    return rows.map(rowToLease);
  }
}
