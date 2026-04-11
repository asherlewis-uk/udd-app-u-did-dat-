/**
 * Session lifecycle integration tests
 *
 * Requires a real PostgreSQL database with migrations applied.
 * Run via: DATABASE_URL=<dsn> pnpm --filter @udd/database test:integration
 * In CI the `contract-tests` job provides a postgres service container.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { closePool } from '../connection.js';
import { PgSessionRepository } from './pg/session.js';
import { PgPreviewRouteRepository } from './pg/preview-route.js';
import { withTransaction } from '../connection.js';

const TEST_WORKSPACE_ID = '00000000-0000-0000-0000-000000000001';
const TEST_PROJECT_ID = '00000000-0000-0000-0000-000000000002';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000003';

const sessions = new PgSessionRepository();
const previewRoutes = new PgPreviewRouteRepository();

beforeAll(() => {
  if (!process.env['DATABASE_URL']) {
    throw new Error('DATABASE_URL must be set to run integration tests');
  }
});

afterAll(async () => {
  await closePool();
});

describe('Session lifecycle', () => {
  it('creates a session and finds it by id', async () => {
    const session = await sessions.create({
      projectId: TEST_PROJECT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
      idleTimeoutSeconds: 1800,
    });

    expect(session.id).toBeTruthy();
    expect(session.state).toBe('pending');
    expect(session.workspaceId).toBe(TEST_WORKSPACE_ID);

    const found = await sessions.findById(session.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(session.id);
    expect(found!.state).toBe('pending');
  });

  it('transitions a session pending → running → stopping atomically', async () => {
    const session = await sessions.create({
      projectId: TEST_PROJECT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
    });

    // Start the session
    const running = await sessions.updateState(
      session.id,
      'running',
      session.version,
      {
        workerHost: '10.0.0.1',
        hostPort: 32100,
        startedAt: new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      },
    );
    expect(running.state).toBe('running');
    expect(running.workerHost).toBe('10.0.0.1');
    expect(running.hostPort).toBe(32100);
    expect(running.version).toBe(session.version + 1);

    // Stop the session — atomic transaction that also revokes preview routes (H-1)
    const stopped = await withTransaction(async (client) => {
      const s = await sessions.updateState(
        running.id,
        'stopping',
        running.version,
        { stoppedAt: new Date().toISOString() },
        client,
      );
      await previewRoutes.revokeAllForSession(running.id, client);
      return s;
    });

    expect(stopped.state).toBe('stopping');
    expect(stopped.stoppedAt).not.toBeNull();
    expect(stopped.version).toBe(running.version + 1);
  });

  it('rejects a stale version update (optimistic concurrency)', async () => {
    const session = await sessions.create({
      projectId: TEST_PROJECT_ID,
      workspaceId: TEST_WORKSPACE_ID,
      userId: TEST_USER_ID,
    });

    // First update succeeds
    await sessions.updateState(session.id, 'running', session.version, {
      workerHost: '10.0.0.2',
      hostPort: 32101,
      startedAt: new Date().toISOString(),
      lastActivityAt: new Date().toISOString(),
    });

    // Second update with same (now stale) version must fail
    const { OptimisticConcurrencyError } = await import('./pg/session.js');
    await expect(
      sessions.updateState(session.id, 'running', session.version, {}),
    ).rejects.toBeInstanceOf(OptimisticConcurrencyError);
  });
});
