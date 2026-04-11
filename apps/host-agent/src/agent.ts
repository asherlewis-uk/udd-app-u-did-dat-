import { createLogger } from '@udd/observability';
import { config } from '@udd/config';

const logger = createLogger('host-agent');

// ============================================================
// Host agent — runs on each worker host
// Responsibilities:
//   1. Register host on startup
//   2. Publish heartbeat with capacity snapshot on interval
//   3. Report sandbox lifecycle events
//   4. Detect orphaned sandboxes
// ============================================================

const WORKER_HOST = process.env['WORKER_HOST'] ?? 'localhost';
const WORKER_MANAGER_URL = config.services.workerManagerBaseUrl();

export async function registerHost(): Promise<void> {
  logger.info('Registering host with worker manager', { workerHost: WORKER_HOST });
  // Phase 2: POST to WORKER_MANAGER_URL/internal/register
}

export async function publishHeartbeat(): Promise<void> {
  const snapshot = await collectCapacitySnapshot();
  logger.debug('Publishing heartbeat', { workerHost: WORKER_HOST, snapshot });
  // Phase 2: POST snapshot to worker-manager
}

export async function collectCapacitySnapshot(): Promise<{
  workerHost: string;
  totalSlots: number;
  usedSlots: number;
  availablePorts: number[];
  healthy: boolean;
}> {
  // Phase 2: query the host OS / container runtime for actual state
  return {
    workerHost: WORKER_HOST,
    totalSlots: 10,
    usedSlots: 0,
    availablePorts: Array.from({ length: 10 }, (_, i) => 32100 + i),
    healthy: true,
  };
}

export function startHeartbeatLoop(intervalMs: number): NodeJS.Timeout {
  return setInterval(() => {
    publishHeartbeat().catch((err) => {
      logger.error('Heartbeat failed', { err });
    });
  }, intervalMs);
}
