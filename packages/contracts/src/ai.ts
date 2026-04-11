import type {
  ProviderType,
  PipelineRunStatus,
  PipelineRunSourceType,
  AuthScheme,
  ModelCatalogMode,
} from './enums.js';

// ============================================================
// AI Provider Configuration
// ============================================================

export interface ProviderConfig {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  name: string;
  providerType: ProviderType;
  endpointUrl: string;
  modelCatalogMode: ModelCatalogMode;
  authScheme: AuthScheme;
  /** External secret manager reference — NEVER the actual credential */
  credentialSecretRef: string;
  /** Encrypted reference for any custom headers — NEVER plaintext */
  customHeadersEncryptedRef?: string | null;
  isActive: boolean;
  isSystemManaged: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

/** Read-safe view — credential fields are redacted */
export interface ProviderConfigView extends Omit<ProviderConfig, 'credentialSecretRef' | 'customHeadersEncryptedRef'> {
  credentialStatus: 'active' | 'expired' | 'rotating' | 'unknown';
  lastRotatedAt?: string | null;
}

// ============================================================
// Agent Roles
// ============================================================

export interface AgentRole {
  id: string;
  workspaceId: string;
  createdByUserId: string;
  name: string;
  description?: string | null;
  providerConfigId: string;
  modelIdentifier: string;
  endpointOverrideUrl?: string | null;
  /** Object storage reference for system instructions — not inline */
  systemInstructionsRef?: string | null;
  roleConfigJson: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Pipeline Definitions
// ============================================================

export interface PipelineNode {
  id: string;
  agentRoleId: string;
  kind: 'role_step';
}

export interface PipelineEdge {
  from: string;
  to: string;
}

export interface PipelineDefinitionJson {
  nodes: PipelineNode[];
  edges: PipelineEdge[];
}

export interface PipelineDefinition {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  createdByUserId: string;
  name: string;
  description?: string | null;
  pipelineVersion: number;
  pipelineDefinitionJson: PipelineDefinitionJson;
  inputSchemaJson?: Record<string, unknown>;
  outputSchemaJson?: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Pipeline Runs
// ============================================================

export interface PipelineRunRecord {
  id: string;
  workspaceId: string;
  projectId?: string | null;
  pipelineId: string;
  triggeredByUserId: string;
  sourceType: PipelineRunSourceType;
  status: PipelineRunStatus;
  /** Object storage reference for input payload */
  inputPayloadRef?: string | null;
  /** Object storage reference for output payload */
  outputPayloadRef?: string | null;
  errorSummary?: string | null;
  startedAt?: string | null;
  finishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Model Invocation — the ONLY boundary for model calls
// ============================================================

export interface ModelInvocationRequest {
  providerConfigId: string;
  agentRoleId: string;
  modelIdentifier: string;
  endpointUrl: string;
  input: Record<string, unknown>;
  metadata: {
    workspaceId: string;
    pipelineId?: string;
    pipelineRunId?: string;
    correlationId: string;
  };
}

export interface ModelInvocationResponse {
  providerMessageId?: string | null;
  status: 'accepted' | 'completed' | 'failed';
  output?: Record<string, unknown>;
  errorCode?: string | null;
  errorMessage?: string | null;
  /** Object storage reference for full raw response — never inline */
  rawResponseRef?: string | null;
}

export interface ModelProviderCapabilities {
  supportsStreaming: boolean;
  supportsTools: boolean;
  supportsImages: boolean;
  supportsJsonMode: boolean;
  maxContextHint?: number | null;
}

// ============================================================
// ModelProviderAdapter — mandatory boundary interface
// ALL model interactions MUST go through this interface.
// Direct provider SDK calls outside adapter implementations are forbidden.
// ============================================================

export interface ModelProviderAdapter {
  /** Returns true if this adapter handles the given providerType */
  supports(providerType: ProviderType): boolean;

  /** Return static or dynamically-fetched capability set for the provider */
  getCapabilities(config: ProviderConfig): Promise<ModelProviderCapabilities>;

  /** Validate endpoint URL, auth scheme, and connectivity without invoking a model */
  validateConfig(input: {
    providerType: ProviderType;
    endpointUrl: string;
    authScheme: AuthScheme;
  }): Promise<{ valid: boolean; errors: string[] }>;

  /**
   * Invoke the model. Credentials are injected by the caller from the secret manager.
   * The adapter must NEVER log or re-surface the credential from the request.
   */
  invoke(request: ModelInvocationRequest & { _credential: string }): Promise<ModelInvocationResponse>;
}

// ============================================================
// Invocation error codes (standardized across all adapters)
// ============================================================

export const INVOCATION_ERROR_CODES = {
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
  INVALID_CREDENTIAL: 'INVALID_CREDENTIAL',
  RATE_LIMITED: 'RATE_LIMITED',
  PROVIDER_UNAVAILABLE: 'PROVIDER_UNAVAILABLE',
  CONTEXT_LENGTH_EXCEEDED: 'CONTEXT_LENGTH_EXCEEDED',
  CONTENT_FILTERED: 'CONTENT_FILTERED',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN: 'UNKNOWN',
} as const;

export type InvocationErrorCode = (typeof INVOCATION_ERROR_CODES)[keyof typeof INVOCATION_ERROR_CODES];
