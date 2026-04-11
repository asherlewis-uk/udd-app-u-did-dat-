import { randomUUID } from 'node:crypto';
import type { Session, SessionState, SessionCreatedEvent, SessionStateChangedEvent } from '@udd/contracts';
import { SESSION_TRANSITIONS } from '@udd/contracts';
import {
  PgSessionRepository,
  PgSandboxLeaseRepository,
  PgWorkerCapacityRepository,
  PgPreviewRouteRepository,
  PgAuditLogRepository,
  OptimisticConcurrencyError,
  withTransaction,
} from '@udd/database';
import { NoopEventPublisher } from '@udd/events';
import type { EventPublisher } from '@udd/events';
import { createLogger } from '@udd/observability';

const logger = createLogger('orchestrator:session');

const LEASE_TTL_SECONDS = parseInt(process.env['SANDBOX_LEASE_TTL_SECONDS'] ?? '86400', 10);

export interface SessionService {
  createSession(params: {
    projectId: string;
    workspaceId: string;
    userId: string;
    idleTimeoutSeconds?: number;
    correlationId: string;
  }): Promise<Session>;

  startSession(params: {
    sessionId: string;
    correlationId: string;
  }): Promise<Session>;

  stopSession(params: {
    sessionId: string;
    reason?: string;
    correlationId: string;
  }): Promise<Session>;

  getSession(sessionId: string): Promise<Session | null>;
}

/**
 * Validate a session state transition against the allowed transition table.
 */
export function isValidTransition(from: SessionState, to: SessionState): boolean {
  return SESSION_TRANSITIONS[from].includes(to);
}

export class PgSessionService implements SessionService {
  private readonly sessions = new PgSessionRepository();
  private readonly leases = new PgSandboxLeaseRepository();
  private readonly workers = new PgWorkerCapacityRepository();
  private readonly previewRoutes = new PgPreviewRouteRepository();
  private readonly auditLogs = new PgAuditLogRepository();
  private readonly events: EventPublisher;

  constructor(events?: EventPublisher) {
    this.events = events ?? new NoopEventPublisher();
  }

  async createSession(params: {
    projectId: string;
    workspaceId: string;
    userId: string;
    idleTimeoutSeconds?: number;
    correlationId: string;
  }): Promise<Session> {
    const createData: Parameters<typeof this.sessions.create>[0] = {
      projectId: params.projectId,
      workspaceId: params.workspaceId,
      userId: params.userId,
    };
    if (params.idleTimeoutSeconds !== undefined) createData.idleTimeoutSeconds = params.idleTimeoutSeconds;
    const session = await this.sessions.create(createData);

    await this.auditLogs.append({
      workspaceId: params.workspaceId,
      actorUserId: params.userId,
      action: 'session.created',
      resourceType: 'session',
      resourceId: session.id,
      metadata: { projectId: params.projectId },
    });

    const createdEvt: SessionCreatedEvent = {
      eventId: randomUUID(),
      schemaVersion: 1,
      topic: 'session.created',
      payload: {
        sessionId: session.id,
        projectId: params.projectId,
        workspaceId: params.workspaceId,
        userId: params.userId,
      },
      correlationId: params.correlationId,
      timestamp: new Date().toISOString(),
    };
    await this.events.publish(createdEvt);

    return session;
  }

  /**
   * Start a session atomically (C-1 fix).
   *
   * All four operations — locking the session row, selecting a worker,
   * creating the sandbox lease, and transitioning session state — run inside
   * a single serialisable transaction.  The partial unique index on
   * sandbox_leases (worker_host, host_port) WHERE non-terminal prevents any
   * two concurrent transactions from allocating the same port.
   *
   * `FOR UPDATE SKIP LOCKED` on the worker capacity row ensures concurrent
   * startSession calls pick different workers rather than blocking on the
   * same one (L-6 fix).
   *
   * Event publication happens after COMMIT (at-least-once delivery is
   * acceptable; losing a COMMIT and re-running is safer than publishing
   * before the row is durable).
   */
  async startSession(params: {
    sessionId: string;
    correlationId: string;
  }): Promise<Session> {
    const started = await withTransaction(async (client) => {
      // Lock this session row — prevents concurrent startSession calls from
      // reading the same version and racing on the state transition.
      const session = await this.sessions.findByIdForUpdate(params.sessionId, client);
      if (!session) throw new Error(`Session ${params.sessionId} not found`);

      if (!isValidTransition(session.state, 'starting')) {
        throw new Error(`Cannot start session in state '${session.state}'`);
      }

      // Select the best available worker, locking its capacity row.
      // SKIP LOCKED means we immediately move to the next worker if another
      // concurrent transaction has already claimed this one.
      const worker = await this.workers.findHealthyWithLock(client);
      if (!worker) {
        throw new Error('No worker capacity available');
      }

      const hostPort = worker.availablePorts[0]!;
      const expiresAt = new Date(Date.now() + LEASE_TTL_SECONDS * 1000);

      // INSERT the lease inside the transaction — if updateState below throws,
      // the INSERT rolls back automatically (H-2 fix: no orphaned leases).
      await this.leases.create(
        { sessionId: session.id, workerHost: worker.workerHost, hostPort, expiresAt },
        client,
      );

      // Transition session state.  The partial unique index on sandbox_leases
      // and the session row lock together guarantee no double-allocation.
      return this.sessions.updateState(
        session.id,
        'starting',
        session.version,
        {
          workerHost: worker.workerHost,
          hostPort,
          startedAt: new Date().toISOString(),
          lastActivityAt: new Date().toISOString(),
        },
        client,
      );
    });

    // Publish after the transaction commits.
    logger.info('Session starting', {
      sessionId: started.id,
      workerHost: started.workerHost,
      hostPort: started.hostPort,
      correlationId: params.correlationId,
    });

    const startEvt: SessionStateChangedEvent = {
      eventId: randomUUID(),
      schemaVersion: 1,
      topic: 'session.state_changed',
      payload: {
        sessionId: started.id,
        workspaceId: started.workspaceId,
        fromState: 'creating',
        toState: 'starting',
        reason: 'user_requested',
      },
      correlationId: params.correlationId,
      timestamp: new Date().toISOString(),
    };
    await this.events.publish(startEvt);

    return started;
  }

  /**
   * Stop a session atomically (H-1 fix).
   *
   * Preview route revocations and the session state transition run inside a
   * single transaction.  If the state update fails (e.g. a concurrent version
   * bump), the revocations roll back — routes are never silently removed while
   * the session remains 'running'.
   */
  async stopSession(params: {
    sessionId: string;
    reason?: string;
    correlationId: string;
  }): Promise<Session> {
    const stopped = await withTransaction(async (client) => {
      // Lock the session row to prevent concurrent stop/start races.
      const session = await this.sessions.findByIdForUpdate(params.sessionId, client);
      if (!session) throw new Error(`Session ${params.sessionId} not found`);

      if (!isValidTransition(session.state, 'stopping')) {
        throw new Error(`Cannot stop session in state '${session.state}'`);
      }

      // Revoke preview routes inside the transaction so they roll back if the
      // state transition below fails (M-2 fix).
      await this.previewRoutes.revokeAllForSession(session.id, client);

      return this.sessions.updateState(
        session.id,
        'stopping',
        session.version,
        { stoppedAt: new Date().toISOString() },
        client,
      );
    });

    // Audit log and events after COMMIT.
    logger.info('Session stopping', {
      sessionId: stopped.id,
      reason: params.reason,
      correlationId: params.correlationId,
    });

    await this.auditLogs.append({
      workspaceId: stopped.workspaceId,
      actorUserId: stopped.userId,
      action: 'session.stopped',
      resourceType: 'session',
      resourceId: stopped.id,
      metadata: { reason: params.reason ?? 'user_requested' },
    });

    const stopEvt: SessionStateChangedEvent = {
      eventId: randomUUID(),
      schemaVersion: 1,
      topic: 'session.state_changed',
      payload: {
        sessionId: stopped.id,
        workspaceId: stopped.workspaceId,
        fromState: 'running',
        toState: 'stopping',
        reason: params.reason ?? 'user_requested',
      },
      correlationId: params.correlationId,
      timestamp: new Date().toISOString(),
    };
    await this.events.publish(stopEvt);

    return stopped;
  }

  async getSession(sessionId: string): Promise<Session | null> {
    return this.sessions.findById(sessionId);
  }
}

// Export type guard
export { OptimisticConcurrencyError };
