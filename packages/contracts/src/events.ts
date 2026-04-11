import type { SessionState, PreviewRouteState, PipelineRunStatus } from './enums.js';

// ============================================================
// Event Topic Names — single source of truth
// ============================================================

export const TOPICS = {
  SESSION_CREATED: 'session.created',
  SESSION_RESUMED: 'session.resumed',
  SESSION_IDLE_DETECTED: 'session.idle_detected',
  SESSION_TERMINATED: 'session.terminated',
  SESSION_STATE_CHANGED: 'session.state_changed',

  PREVIEW_ROUTE_BOUND: 'preview.route.bound',
  PREVIEW_ROUTE_REVOKED: 'preview.route.revoked',

  SANDBOX_CAPACITY_LOW: 'sandbox.capacity.low',
  WORKER_REGISTERED: 'worker.registered',
  WORKER_UNHEALTHY: 'worker.unhealthy',

  ARTIFACT_CREATED: 'artifact.created',
  USAGE_METER_RECORDED: 'usage.meter.recorded',

  PROVIDER_CONFIG_CREATED: 'provider_config.created',
  PROVIDER_CONFIG_UPDATED: 'provider_config.updated',
  PROVIDER_CONFIG_SECRET_ROTATED: 'provider_config.secret_rotated',
  PROVIDER_CONFIG_DELETED: 'provider_config.deleted',

  AGENT_ROLE_CREATED: 'agent_role.created',
  AGENT_ROLE_UPDATED: 'agent_role.updated',

  PIPELINE_CREATED: 'pipeline.created',
  PIPELINE_UPDATED: 'pipeline.updated',

  PIPELINE_RUN_CREATED: 'pipeline_run.created',
  PIPELINE_RUN_STATUS_CHANGED: 'pipeline_run.status_changed',
} as const;

export type Topic = (typeof TOPICS)[keyof typeof TOPICS];

// ============================================================
// Base event envelope
// ============================================================

export interface BaseEvent {
  eventId: string;
  topic: Topic;
  correlationId: string;
  timestamp: string;
  schemaVersion: 1;
}

// ============================================================
// Session events — publisher: orchestrator
// ============================================================

export interface SessionCreatedEvent extends BaseEvent {
  topic: typeof TOPICS.SESSION_CREATED;
  payload: {
    sessionId: string;
    projectId: string;
    workspaceId: string;
    userId: string;
  };
}

export interface SessionResumedEvent extends BaseEvent {
  topic: typeof TOPICS.SESSION_RESUMED;
  payload: {
    sessionId: string;
    workspaceId: string;
  };
}

export interface SessionIdleDetectedEvent extends BaseEvent {
  topic: typeof TOPICS.SESSION_IDLE_DETECTED;
  payload: {
    sessionId: string;
    workspaceId: string;
    idleFor: number; // seconds
  };
}

export interface SessionTerminatedEvent extends BaseEvent {
  topic: typeof TOPICS.SESSION_TERMINATED;
  payload: {
    sessionId: string;
    projectId: string;
    workspaceId: string;
    userId: string;
    reason: string;
    workerHost?: string | null;
    hostPort?: number | null;
  };
}

export interface SessionStateChangedEvent extends BaseEvent {
  topic: typeof TOPICS.SESSION_STATE_CHANGED;
  payload: {
    sessionId: string;
    workspaceId: string;
    fromState: SessionState;
    toState: SessionState;
    reason: string;
  };
}

// ============================================================
// Preview events — publisher: orchestrator / session-reaper
// ============================================================

export interface PreviewRouteBoundEvent extends BaseEvent {
  topic: typeof TOPICS.PREVIEW_ROUTE_BOUND;
  payload: {
    previewId: string;
    sessionId: string;
    projectId: string;
    workspaceId: string;
    workerHost: string;
    hostPort: number;
    state: PreviewRouteState;
  };
}

export interface PreviewRouteRevokedEvent extends BaseEvent {
  topic: typeof TOPICS.PREVIEW_ROUTE_REVOKED;
  payload: {
    previewId: string;
    sessionId: string;
    workspaceId: string;
    reason: string;
  };
}

// ============================================================
// Worker / Sandbox events — publisher: worker-manager
// ============================================================

export interface SandboxCapacityLowEvent extends BaseEvent {
  topic: typeof TOPICS.SANDBOX_CAPACITY_LOW;
  payload: {
    workerHost: string;
    availableSlots: number;
    threshold: number;
  };
}

export interface WorkerRegisteredEvent extends BaseEvent {
  topic: typeof TOPICS.WORKER_REGISTERED;
  payload: {
    workerHost: string;
    totalSlots: number;
  };
}

// ============================================================
// Usage events — publisher: usage-meter
// ============================================================

export interface UsageMeterRecordedEvent extends BaseEvent {
  topic: typeof TOPICS.USAGE_METER_RECORDED;
  payload: {
    usageEventId: string;
    workspaceId: string;
    eventType: string;
    resourceId: string;
    quantity: number;
    unit: string;
  };
}

// ============================================================
// AI Orchestration events — publisher: ai-orchestration
// ============================================================

export interface ProviderConfigCreatedEvent extends BaseEvent {
  topic: typeof TOPICS.PROVIDER_CONFIG_CREATED;
  payload: {
    providerConfigId: string;
    workspaceId: string;
    name: string;
    providerType: string;
    /** Never include credential values */
  };
}

export interface ProviderConfigUpdatedEvent extends BaseEvent {
  topic: typeof TOPICS.PROVIDER_CONFIG_UPDATED;
  payload: {
    providerConfigId: string;
    workspaceId: string;
    changedFields: string[];
  };
}

export interface ProviderConfigSecretRotatedEvent extends BaseEvent {
  topic: typeof TOPICS.PROVIDER_CONFIG_SECRET_ROTATED;
  payload: {
    providerConfigId: string;
    workspaceId: string;
    rotatedByUserId: string;
  };
}

export interface AgentRoleCreatedEvent extends BaseEvent {
  topic: typeof TOPICS.AGENT_ROLE_CREATED;
  payload: {
    agentRoleId: string;
    workspaceId: string;
    name: string;
    providerConfigId: string;
  };
}

export interface PipelineCreatedEvent extends BaseEvent {
  topic: typeof TOPICS.PIPELINE_CREATED;
  payload: {
    pipelineId: string;
    workspaceId: string;
    name: string;
  };
}

export interface PipelineRunCreatedEvent extends BaseEvent {
  topic: typeof TOPICS.PIPELINE_RUN_CREATED;
  payload: {
    pipelineRunId: string;
    pipelineId: string;
    workspaceId: string;
    triggeredByUserId: string;
    sourceType: string;
  };
}

export interface PipelineRunStatusChangedEvent extends BaseEvent {
  topic: typeof TOPICS.PIPELINE_RUN_STATUS_CHANGED;
  payload: {
    pipelineRunId: string;
    pipelineId: string;
    workspaceId: string;
    fromStatus: PipelineRunStatus;
    toStatus: PipelineRunStatus;
    errorSummary?: string | null;
  };
}

// ============================================================
// Union type of all events
// ============================================================

export type PlatformEvent =
  | SessionCreatedEvent
  | SessionResumedEvent
  | SessionIdleDetectedEvent
  | SessionTerminatedEvent
  | SessionStateChangedEvent
  | PreviewRouteBoundEvent
  | PreviewRouteRevokedEvent
  | SandboxCapacityLowEvent
  | WorkerRegisteredEvent
  | UsageMeterRecordedEvent
  | ProviderConfigCreatedEvent
  | ProviderConfigUpdatedEvent
  | ProviderConfigSecretRotatedEvent
  | AgentRoleCreatedEvent
  | PipelineCreatedEvent
  | PipelineRunCreatedEvent
  | PipelineRunStatusChangedEvent;
