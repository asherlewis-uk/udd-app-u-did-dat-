import os from 'node:os';
import net from 'node:net';
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

const WORKER_HOST = config.worker.host();
const WORKER_MANAGER_URL = config.services.workerManagerBaseUrl();

// ============================================================
// Slot & port tracking
// ============================================================

/**
 * In-memory set of active slot identifiers (e.g. container IDs or session
 * IDs). Other parts of the agent call `allocateSlot` / `releaseSlot` when
 * containers are started / stopped.
 */
const activeSlots = new Set<string>();

/**
 * In-memory set of ports currently allocated to running containers.
 * Mirrors `activeSlots` lifecycle — callers use `allocatePort` /
 * `releasePort`.
 */
const allocatedPorts = new Set<number>();

/** Register a slot as active. Returns `false` if capacity is full. */
export function allocateSlot(id: string): boolean {
  const totalSlots = config.worker.totalSlots();
  if (activeSlots.size >= totalSlots) return false;
  activeSlots.add(id);
  return true;
}

/** Release a previously-allocated slot. */
export function releaseSlot(id: string): void {
  activeSlots.delete(id);
}

/**
 * Reserve a port from the configured range.
 * Returns the port number, or `null` if the range is exhausted.
 */
export function allocatePort(): number | null {
  const start = config.worker.portRangeStart();
  const size = config.worker.portRangeSize();
  for (let port = start; port < start + size; port++) {
    if (!allocatedPorts.has(port)) {
      allocatedPorts.add(port);
      return port;
    }
  }
  return null;
}

/** Release a previously-allocated port back to the pool. */
export function releasePort(port: number): void {
  allocatedPorts.delete(port);
}

// ============================================================
// Health helpers
// ============================================================

const MEMORY_UNHEALTHY_THRESHOLD = 0.10; // < 10 % free → unhealthy

function isSystemHealthy(): boolean {
  const freeMem = os.freemem();
  const totalMem = os.totalmem();
  if (totalMem === 0) return false;
  return freeMem / totalMem >= MEMORY_UNHEALTHY_THRESHOLD;
}

// ============================================================
// Port availability check
// ============================================================

/**
 * Probes whether a single port is genuinely available by briefly
 * binding a TCP server to it.
 */
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, '0.0.0.0', () => {
      server.close(() => resolve(true));
    });
  });
}

/**
 * Returns the subset of un-allocated ports in the configured range that are
 * also genuinely free on the OS (not bound by another process).
 */
async function getAvailablePorts(): Promise<number[]> {
  const start = config.worker.portRangeStart();
  const size = config.worker.portRangeSize();
  const totalSlots = config.worker.totalSlots();

  const candidates: number[] = [];
  for (let port = start; port < start + size; port++) {
    if (!allocatedPorts.has(port)) {
      candidates.push(port);
    }
  }

  // Probe at most `totalSlots` candidates to keep the check bounded
  const toProbe = candidates.slice(0, totalSlots);
  const results = await Promise.all(
    toProbe.map(async (port) => ({ port, free: await isPortAvailable(port) })),
  );

  return results.filter((r) => r.free).map((r) => r.port);
}

// ============================================================
// Snapshot & heartbeat
// ============================================================

async function postSnapshot(
  snapshot: Awaited<ReturnType<typeof collectCapacitySnapshot>>,
): Promise<void> {
  const url = `${WORKER_MANAGER_URL}/internal/capacity-snapshot`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(snapshot),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`worker-manager responded ${res.status}: ${text}`);
  }
}

export async function registerHost(): Promise<void> {
  logger.info('Registering host with worker manager', { workerHost: WORKER_HOST });
  const snapshot = await collectCapacitySnapshot();
  await postSnapshot(snapshot);
}

export async function publishHeartbeat(): Promise<void> {
  const snapshot = await collectCapacitySnapshot();
  logger.debug('Publishing heartbeat', { workerHost: WORKER_HOST, snapshot });
  await postSnapshot(snapshot);
}

export async function collectCapacitySnapshot(): Promise<{
  workerHost: string;
  totalSlots: number;
  usedSlots: number;
  availablePorts: number[];
  healthy: boolean;
}> {
  const totalSlots = config.worker.totalSlots();
  const usedSlots = activeSlots.size;
  const availablePorts = await getAvailablePorts();
  const healthy = isSystemHealthy();

  return {
    workerHost: WORKER_HOST,
    totalSlots,
    usedSlots,
    availablePorts,
    healthy,
  };
}

export function startHeartbeatLoop(intervalMs: number): NodeJS.Timeout {
  return setInterval(() => {
    publishHeartbeat().catch((err) => {
      logger.error('Heartbeat failed', { err });
    });
  }, intervalMs);
}
