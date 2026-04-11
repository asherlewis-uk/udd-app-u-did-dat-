import type { MembershipRole, Permission, ProviderType, AuthScheme, ModelCatalogMode, PipelineRunSourceType } from './enums.js';

// ============================================================
// Standardized Error Envelope
// ============================================================

export interface ApiError {
  /** Machine-readable error code */
  code: string;
  /** Human-readable message */
  message: string;
  /** Validation errors, field-level issues */
  details?: unknown[];
  /** Trace correlation ID */
  correlationId: string;
}

export interface ApiResponse<T> {
  data: T;
  correlationId: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  nextCursor?: string | null;
  hasMore: boolean;
  correlationId: string;
}

// ============================================================
// Pagination
// ============================================================

export interface PaginationQuery {
  cursor?: string;
  limit?: number;
}

// ============================================================
// Auth / Identity DTOs
// ============================================================

export interface ExchangeTokenRequest {
  workosToken: string;
}

export interface ExchangeTokenResponse {
  sessionToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string | null;
  };
}

export interface MeResponse {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
}

// ============================================================
// Workspace DTOs
// ============================================================

export interface CreateWorkspaceRequest {
  name: string;
  organizationId: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
}

export interface InviteMemberRequest {
  email: string;
  role: MembershipRole;
}

export interface UpdateMemberRoleRequest {
  role: MembershipRole;
}

// ============================================================
// Project DTOs
// ============================================================

export interface CreateProjectRequest {
  name: string;
  description?: string;
}

export interface UpdateProjectRequest {
  name?: string;
  description?: string;
}

export interface ConnectRepoRequest {
  provider: 'github' | 'gitlab' | 'bitbucket';
  remoteUrl: string;
  defaultBranch: string;
}

// ============================================================
// Session DTOs
// ============================================================

export interface CreateSessionRequest {
  idleTimeoutSeconds?: number;
}

export interface StartSessionRequest {
  environmentName?: string;
}

export interface StopSessionRequest {
  reason?: string;
}

export interface CreateCheckpointRequest {
  description?: string;
}

// ============================================================
// Preview DTOs
// ============================================================

export interface CreatePreviewRequest {
  /** Port on the sandbox that the preview app is listening on */
  sandboxPort: number;
  /** Optional TTL in seconds */
  ttlSeconds?: number;
}

// ============================================================
// Comment DTOs
// ============================================================

export interface CreateCommentRequest {
  body: string;
  threadId?: string;
  anchor?: {
    type: 'file' | 'preview' | 'general';
    path?: string;
    line?: number;
  };
}

// ============================================================
// AI Provider Config DTOs
// ============================================================

export interface CreateProviderConfigRequest {
  name: string;
  providerType: ProviderType;
  endpointUrl: string;
  modelCatalogMode: ModelCatalogMode;
  authScheme: AuthScheme;
  /** Plaintext credential — accepted here, immediately stored in secret manager, never persisted in DB */
  credential: string;
  customHeaders?: Record<string, string>;
}

export interface UpdateProviderConfigRequest {
  name?: string;
  endpointUrl?: string;
  modelCatalogMode?: ModelCatalogMode;
  isActive?: boolean;
}

export interface RotateSecretRequest {
  /** New credential — immediately stored in secret manager */
  newCredential: string;
}

// ============================================================
// AI Role DTOs
// ============================================================

export interface CreateAgentRoleRequest {
  name: string;
  description?: string;
  providerConfigId: string;
  modelIdentifier: string;
  endpointOverrideUrl?: string;
  systemInstructions?: string;
  roleConfig?: Record<string, unknown>;
}

export interface UpdateAgentRoleRequest {
  name?: string;
  description?: string;
  modelIdentifier?: string;
  endpointOverrideUrl?: string | null;
  systemInstructions?: string;
  roleConfig?: Record<string, unknown>;
  isActive?: boolean;
}

// ============================================================
// AI Pipeline DTOs
// ============================================================

export interface CreatePipelineRequest {
  name: string;
  description?: string;
  projectId?: string;
  definition: {
    nodes: Array<{ id: string; agentRoleId: string; kind: 'role_step' }>;
    edges: Array<{ from: string; to: string }>;
  };
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

export interface UpdatePipelineRequest {
  name?: string;
  description?: string;
  definition?: {
    nodes: Array<{ id: string; agentRoleId: string; kind: 'role_step' }>;
    edges: Array<{ from: string; to: string }>;
  };
  isActive?: boolean;
}

// ============================================================
// AI Pipeline Run DTOs
// ============================================================

export interface CreatePipelineRunRequest {
  sourceType: PipelineRunSourceType;
  inputPayload?: Record<string, unknown>;
  /** Idempotency key — same key returns existing run */
  idempotencyKey?: string;
}

// ============================================================
// WebSocket Channel Contracts
// ============================================================

export type PresenceEvent =
  | { type: 'user_joined'; userId: string; displayName: string; avatarUrl?: string | null; timestamp: string }
  | { type: 'user_left'; userId: string; timestamp: string }
  | { type: 'cursor_moved'; userId: string; filePath: string; line: number; column: number };

export type SessionLogEvent = {
  type: 'log';
  sessionId: string;
  stream: 'stdout' | 'stderr';
  data: string;
  timestamp: string;
};

export type RunStatusEvent = {
  type: 'run_status';
  runId: string;
  status: string;
  timestamp: string;
};

// ============================================================
// API error codes (machine-readable)
// ============================================================

export const API_ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  GONE: 'GONE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  SESSION_NOT_RUNNING: 'SESSION_NOT_RUNNING',
  WORKER_UNAVAILABLE: 'WORKER_UNAVAILABLE',
  PREVIEW_EXPIRED: 'PREVIEW_EXPIRED',
  PREVIEW_REVOKED: 'PREVIEW_REVOKED',
  PIPELINE_INACTIVE: 'PIPELINE_INACTIVE',
  ROLE_INACTIVE: 'ROLE_INACTIVE',
  PROVIDER_INACTIVE: 'PROVIDER_INACTIVE',
  INVALID_DAG: 'INVALID_DAG',
  IDEMPOTENCY_CONFLICT: 'IDEMPOTENCY_CONFLICT',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
