import fs from 'node:fs';
import path from 'node:path';
import { getPool, closePool } from './connection.js';

async function migrate(): Promise<void> {
  const pool = getPool();

  // Ensure migrations table exists
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs
    .readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const { rows: applied } = await pool.query<{ version: string }>(
    'SELECT version FROM schema_migrations ORDER BY version',
  );
  const appliedVersions = new Set(applied.map((r) => r.version));

  for (const file of files) {
    const version = file.replace('.sql', '');
    if (appliedVersions.has(version)) {
      console.info(`[migrate] skipping ${version} (already applied)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.info(`[migrate] applying ${version}...`);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [version]);
      await client.query('COMMIT');
      console.info(`[migrate] applied ${version}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[migrate] failed on ${version}:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  console.info('[migrate] all migrations applied');
}

migrate()
  .catch((err) => {
    console.error('[migrate] fatal:', err);
    process.exit(1);
  })
  .finally(() => closePool());
