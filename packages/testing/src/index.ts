import { randomUUID } from 'node:crypto';
import type {
  User, Workspace, Project, Session, PreviewRouteBinding, SandboxLease,
  ProviderConfig, AgentRole, PipelineDefinition, PipelineRunRecord,
  Membership,
} from '@udd/contracts';

// ============================================================
// Test factories — produce minimal valid objects
// Override any field by spreading the result.
// ============================================================

export function makeUser(overrides: Partial<User> = {}): User {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    externalAuthId: `workos_${id}`,
    email: `user-${id}@test.example`,
    displayName: `Test User ${id.slice(0, 8)}`,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    organizationId: randomUUID(),
    name: `workspace-${id.slice(0, 8)}`,
    slug: `workspace-${id.slice(0, 8)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

export function makeMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: randomUUID(),
    userId: randomUUID(),
    workspaceId: randomUUID(),
    role: 'workspace_member',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makeProject(overrides: Partial<Project> = {}): Project {
  const id = overrides.id ?? randomUUID();
  return {
    id,
    workspaceId: randomUUID(),
    name: `project-${id.slice(0, 8)}`,
    slug: `project-${id.slice(0, 8)}`,
    description: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

export function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: randomUUID(),
    projectId: randomUUID(),
    workspaceId: randomUUID(),
    userId: randomUUID(),
    state: 'creating',
    workerHost: null,
    hostPort: null,
    startedAt: null,
    stoppedAt: null,
    lastActivityAt: null,
    idleTimeoutSeconds: 1800,
    version: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makePreviewRoute(overrides: Partial<PreviewRouteBinding> = {}): PreviewRouteBinding {
  return {
    id: randomUUID(),
    previewId: `prev_${randomUUID().replace(/-/g, '').slice(0, 20)}`,
    sessionId: randomUUID(),
    projectId: randomUUID(),
    workspaceId: randomUUID(),
    workerHost: 'worker-001.internal',
    hostPort: 32100,
    state: 'active',
    boundAt: new Date().toISOString(),
    expiresAt: null,
    revokedAt: null,
    version: 0,
    ...overrides,
  };
}

export function makeSandboxLease(overrides: Partial<SandboxLease> = {}): SandboxLease {
  return {
    id: randomUUID(),
    sessionId: randomUUID(),
    workerHost: 'worker-001.internal',
    hostPort: 32100,
    leaseState: 'active',
    leasedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    releasedAt: null,
    version: 0,
    ...overrides,
  };
}

export function makeProviderConfig(overrides: Partial<ProviderConfig> = {}): ProviderConfig {
  return {
    id: randomUUID(),
    workspaceId: randomUUID(),
    createdByUserId: randomUUID(),
    name: 'test-provider',
    providerType: 'anthropic',
    endpointUrl: 'https://api.anthropic.com',
    modelCatalogMode: 'manual',
    authScheme: 'api_key_header',
    credentialSecretRef: 'mem://test-provider/1000',
    customHeadersEncryptedRef: null,
    isActive: true,
    isSystemManaged: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    deletedAt: null,
    ...overrides,
  };
}

export function makeAgentRole(overrides: Partial<AgentRole> = {}): AgentRole {
  return {
    id: randomUUID(),
    workspaceId: randomUUID(),
    createdByUserId: randomUUID(),
    name: 'test-role',
    description: null,
    providerConfigId: randomUUID(),
    modelIdentifier: 'claude-opus-4-6',
    endpointOverrideUrl: null,
    systemInstructionsRef: null,
    roleConfigJson: {},
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

export function makePipelineDefinition(overrides: Partial<PipelineDefinition> = {}): PipelineDefinition {
  const result: PipelineDefinition = {
    id: overrides.id ?? randomUUID(),
    workspaceId: overrides.workspaceId ?? randomUUID(),
    projectId: overrides.projectId ?? null,
    createdByUserId: overrides.createdByUserId ?? randomUUID(),
    name: overrides.name ?? 'test-pipeline',
    description: overrides.description ?? null,
    pipelineVersion: overrides.pipelineVersion ?? 1,
    pipelineDefinitionJson: overrides.pipelineDefinitionJson ?? {
      nodes: [{ id: 'node-1', agentRoleId: randomUUID(), kind: 'role_step' as const }],
      edges: [],
    },
    isActive: overrides.isActive ?? true,
    createdAt: overrides.createdAt ?? new Date().toISOString(),
    updatedAt: overrides.updatedAt ?? new Date().toISOString(),
  };
  if (overrides.inputSchemaJson != null) result.inputSchemaJson = overrides.inputSchemaJson;
  if (overrides.outputSchemaJson != null) result.outputSchemaJson = overrides.outputSchemaJson;
  return result;
}

export function makePipelineRun(overrides: Partial<PipelineRunRecord> = {}): PipelineRunRecord {
  return {
    id: randomUUID(),
    workspaceId: randomUUID(),
    projectId: null,
    pipelineId: randomUUID(),
    triggeredByUserId: randomUUID(),
    sourceType: 'manual',
    status: 'queued',
    inputPayloadRef: null,
    outputPayloadRef: null,
    errorSummary: null,
    startedAt: null,
    finishedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ============================================================
// Assertion helpers
// ============================================================

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${String(value)}`);
}
