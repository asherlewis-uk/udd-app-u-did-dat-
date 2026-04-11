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
      ssl:
        process.env['DATABASE_SSL'] === 'true'
          ? { rejectUnauthorized: true }
          : undefined,
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

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
