import { Pool, type PoolClient, type QueryResult, type QueryResultRow } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env['DATABASE_URL'];
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is required');
    }
    pool = new Pool({
      connectionString,
      max: parseInt(process.env['DATABASE_POOL_MAX'] ?? '10', 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      ssl: process.env['DATABASE_SSL'] === 'true' ? { rejectUnauthorized: true } : undefined,
    });
    pool.on('error', (err) => {
      console.error('[database] unexpected pool error:', err);
    });
  }
  return pool;
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

// -------------------------------------------------------
// Query helpers
//
// All three helpers accept an optional `client` parameter.
// When provided, the query runs on that PoolClient (i.e. inside
// an open transaction).  When omitted, a connection is borrowed
// from the pool as usual.
// -------------------------------------------------------

export async function query<T extends QueryResultRow>(
  sql: string,
  params?: unknown[],
  client?: PoolClient,
): Promise<QueryResult<T>> {
  const executor = client ?? getPool();
  return executor.query<T>(sql, params);
}

export async function queryOne<T extends QueryResultRow>(
  sql: string,
  params?: unknown[],
  client?: PoolClient,
): Promise<T | null> {
  const executor = client ?? getPool();
  const result = await executor.query<T>(sql, params);
  return result.rows[0] ?? null;
}

export async function queryMany<T extends QueryResultRow>(
  sql: string,
  params?: unknown[],
  client?: PoolClient,
): Promise<T[]> {
  const executor = client ?? getPool();
  const result = await executor.query<T>(sql, params);
  return result.rows;
}

// -------------------------------------------------------
// Transaction helper
// -------------------------------------------------------

/** PostgreSQL SQLSTATE for serialization failure — retryable under SERIALIZABLE isolation. */
const SERIALIZATION_FAILURE_CODE = '40001';
const TRANSACTION_MAX_RETRIES = 3;

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  let attempt = 0;
  while (true) {
    const client = await getPool().connect();
    try {
      await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      if (
        attempt < TRANSACTION_MAX_RETRIES - 1 &&
        (err as { code?: string }).code === SERIALIZATION_FAILURE_CODE
      ) {
        attempt++;
        await new Promise<void>((resolve) => setTimeout(resolve, attempt * 30));
        continue;
      }
      throw err;
    } finally {
      client.release();
    }
  }
}
