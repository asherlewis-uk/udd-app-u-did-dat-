import { createLogger } from '@udd/observability';
import {
  PgSessionRepository,
  PgSandboxLeaseRepository,
  closePool,
} from '@udd/database';
import { createEventPublisher } from '@udd/events';
import type { PlatformEvent } from '@udd/contracts';

const logger = createLogger('session-reaper');

const IDLE_THRESHOLD_SECONDS = parseInt(
  process.env['IDLE_THRESHOLD_SECONDS'] ?? '1800',
  10,
);
const SCAN_INTERVAL_MS = parseInt(
  process.env['SCAN_INTERVAL_MS'] ?? '60000',
  10,
);

const sessions = new PgSessionRepository();
const leases = new PgSandboxLeaseRepository();
const events = createEventPublisher();

// ============================================================
// Session reaper — periodic job
// Responsibilities:
//   1. Find sessions in 'running' state beyond idle timeout
//   2. Atomically transition to 'stopping' only if last_activity_at
//      still exceeds the threshold at UPDATE time (H-3 fix)
//   3. Find orphaned sandbox leases → mark orphaned
// ============================================================

async function reapIdleSessions(): Promise<void> {
  // Candidate scan: read sessions that appear idle.
  const candidates = await sessions.findIdleBeyond(IDLE_THRESHOLD_SECONDS);
  if (candidates.length === 0) return;

  logger.info('Checking idle session candidates', { count: candidates.length });

  for (const session of candidates) {
    try {
      // Atomically re-check last_activity_at inside the UPDATE (H-3 fix).
      // If the user resumed activity between findIdleBeyond and here,
      // stopIdleSession returns null and we skip the event — no false reaps.
      const stopped = await sessions.stopIdleSession(
        session.id,
        session.version,
        IDLE_THRESHOLD_SECONDS,
      );

      if (!stopped) {
        logger.info('Session no longer idle, skipping reap', { sessionId: session.id });
        continue;
      }

      await events.publish({
        topic: 'session.state_changed',
        payload: {
          sessionId: stopped.id,
          from: 'running',
          to: 'stopping',
          reason: 'idle_timeout',
        },
        correlationId: `reaper-${stopped.id}`,
        timestamp: new Date().toISOString(),
      } as PlatformEvent);

      logger.info('Reaped idle session', { sessionId: stopped.id });
    } catch (err) {
      // Log and continue — don't let one failure block others
      logger.error('Failed to reap session', { sessionId: session.id, err });
    }
  }
}

async function reapOrphanedLeases(): Promise<void> {
  const orphaned = await leases.findOrphanedLeases();
  if (orphaned.length === 0) return;

  logger.info('Found orphaned leases', { count: orphaned.length });

  for (const lease of orphaned) {
    try {
      await leases.updateState(lease.id, 'orphaned', lease.version);
      logger.info('Marked lease as orphaned', {
        leaseId: lease.id,
        sessionId: lease.sessionId,
      });
    } catch (err) {
      logger.error('Failed to mark lease orphaned', { leaseId: lease.id, err });
    }
  }
}

async function runReaperCycle(): Promise<void> {
  await Promise.allSettled([reapIdleSessions(), reapOrphanedLeases()]);
}

const timer = setInterval(() => {
  runReaperCycle().catch((err) => {
    logger.error('Reaper cycle failed', { err });
  });
}, SCAN_INTERVAL_MS);

logger.info('Session reaper started', {
  scanIntervalMs: SCAN_INTERVAL_MS,
  idleThresholdSeconds: IDLE_THRESHOLD_SECONDS,
});

const shutdown = async (): Promise<void> => {
  clearInterval(timer);
  await closePool();
  logger.info('Session reaper stopped');
  process.exit(0);
};

process.on('SIGTERM', () => void shutdown());
process.on('SIGINT', () => void shutdown());
