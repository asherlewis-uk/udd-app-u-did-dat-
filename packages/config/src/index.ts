// ============================================================
// Environment variable schema and access helpers
// All service configuration must go through this module.
// ============================================================

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required environment variable: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

function optionalInt(key: string, fallback: number): number {
  const val = process.env[key];
  if (!val) return fallback;
  const parsed = parseInt(val, 10);
  if (isNaN(parsed)) throw new Error(`Environment variable ${key} must be an integer`);
  return parsed;
}

function flag(key: string, fallback: boolean): boolean {
  const val = process.env[key];
  if (!val) return fallback;
  return val === 'true' || val === '1';
}

/**
 * Required in production, optional with a dev-friendly fallback otherwise.
 * Prevents silent localhost fallbacks in deployed environments.
 */
function requiredInProduction(key: string, devFallback: string): string {
  const val = process.env[key];
  if (val) return val;
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(`Missing required production environment variable: ${key}`);
  }
  return devFallback;
}

// ============================================================
// Shared config accessors — call at startup, not in hot paths
// ============================================================

export const config = {
  env: optional('NODE_ENV', 'development') as 'development' | 'staging' | 'production' | 'test',

  /** Listener port — each service passes its own fallback for local dev. */
  port: (fallback: number) => optionalInt('PORT', fallback),

  database: {
    url: () => required('DATABASE_URL'),
    poolMax: () => optionalInt('DATABASE_POOL_MAX', 10),
    ssl: () => flag('DATABASE_SSL', false),
  },

  redis: {
    url: () => required('REDIS_URL'),
  },

  auth: {
    jwtSecret: () => required('JWT_SECRET'),
    jwtExpiresInSeconds: () => optionalInt('JWT_EXPIRES_IN_SECONDS', 86_400),
    workosApiKey: () => required('WORKOS_API_KEY'),
    workosClientId: () => required('WORKOS_CLIENT_ID'),
    workosWebhookSecret: () => required('WORKOS_WEBHOOK_SECRET'),
  },

  secrets: {
    /**
     * Secret manager backend.
     * @remarks Only `'gcp'` (`GCPSecretManagerProvider`) and `'memory'` (`InMemorySecretManagerProvider`) are currently implemented.
     */
    provider: () => optional('SECRET_MANAGER_PROVIDER', 'gcp') as 'gcp' | 'memory',
  },

  storage: {
    /**
     * Object storage backend.
     * @remarks Only `'gcs'` (`GCSObjectStorageProvider`) and `'local'` (`LocalObjectStorageProvider`) are currently implemented.
     */
    provider: () => optional('OBJECT_STORAGE_PROVIDER', 'gcs') as 'gcs' | 'local',
    bucket: () => required('OBJECT_STORAGE_BUCKET'),
  },

  queue: {
    provider: () => optional('QUEUE_PROVIDER', 'pubsub') as 'pubsub' | 'noop',
    pubsubTopicPrefix: () => optional('PUBSUB_TOPIC_PREFIX', 'udd'),
  },

  telemetry: {
    otlpEndpoint: () => optional('OTLP_ENDPOINT', ''),
    serviceName: () => optional('OTEL_SERVICE_NAME', 'udd-service'),
    logLevel: () => optional('LOG_LEVEL', 'info') as 'debug' | 'info' | 'warn' | 'error',
  },

  services: {
    apiBaseUrl: () => requiredInProduction('API_BASE_URL', 'http://localhost:8080'),
    orchestratorBaseUrl: () => requiredInProduction('ORCHESTRATOR_BASE_URL', 'http://localhost:3002'),
    collaborationBaseUrl: () => requiredInProduction('COLLABORATION_BASE_URL', 'http://localhost:3003'),
    aiOrchestrationBaseUrl: () => requiredInProduction('AI_ORCHESTRATION_BASE_URL', 'http://localhost:3004'),
    workerManagerBaseUrl: () => requiredInProduction('WORKER_MANAGER_BASE_URL', 'http://localhost:3005'),
    gatewayBaseUrl: () => requiredInProduction('GATEWAY_BASE_URL', 'http://localhost:3000'),
  },

  gateway: {
    workerSubnetPrefix: () => optional('WORKER_SUBNET_PREFIX', '10.'),
  },

  worker: {
    host: () => optional('WORKER_HOST', 'localhost'),
    heartbeatIntervalMs: () => optionalInt('WORKER_HEARTBEAT_INTERVAL_MS', 30_000),
    idleSessionScanIntervalMs: () => optionalInt('IDLE_SESSION_SCAN_INTERVAL_MS', 60_000),
    stuckRunTimeoutMs: () => optionalInt('STUCK_RUN_TIMEOUT_MS', 300_000),
    totalSlots: () => optionalInt('WORKER_TOTAL_SLOTS', 10),
    portRangeStart: () => optionalInt('WORKER_PORT_RANGE_START', 32100),
    portRangeSize: () => optionalInt('WORKER_PORT_RANGE_SIZE', 100),
  },

  runtime: {
    idleThresholdSeconds: () => optionalInt('IDLE_THRESHOLD_SECONDS', 1_800),
    scanIntervalMs: () => optionalInt('SCAN_INTERVAL_MS', 60_000),
    sandboxLeaseTtlSeconds: () => optionalInt('SANDBOX_LEASE_TTL_SECONDS', 86_400),
    pipelineMaxNodes: () => optionalInt('PIPELINE_MAX_NODES', 500),
    pipelineMaxEdges: () => optionalInt('PIPELINE_MAX_EDGES', 5_000),
  },

  preview: {
    domain: () => optional('PREVIEW_DOMAIN', 'localhost:3000'),
    ttlSeconds: () => optionalInt('PREVIEW_DEFAULT_TTL_SECONDS', 3600),
    tokenTtlSeconds: () => optionalInt('PREVIEW_TOKEN_TTL_SECONDS', 300),
  },

  pusher: {
    appId: () => required('PUSHER_APP_ID'),
    key: () => required('PUSHER_KEY'),
    secret: () => required('PUSHER_SECRET'),
    cluster: () => optional('PUSHER_CLUSTER', 'eu'),
  },

  gcp: {
    projectId: () => optional('GCP_PROJECT_ID', ''),
  },

  organization: {
    defaultId: () => optional('DEFAULT_ORGANIZATION_ID', ''),
  },
} as const;

export type Config = typeof config;
