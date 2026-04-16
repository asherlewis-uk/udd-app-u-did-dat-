import type {
  User, Organization, Workspace, Membership, Project, Session, SandboxLease,
  PreviewRouteBinding, WorkerCapacitySnapshot, CollaborationThread, Comment,
  AuditLog, UsageMeterEvent,
} from '@udd/contracts';
import type {
  ProviderConfig, AgentRole, PipelineDefinition, PipelineRunRecord,
} from '@udd/contracts';
import type { SessionState, LeaseState, PreviewRouteState, PipelineRunStatus } from '@udd/contracts';

// ============================================================
// Pagination
// ============================================================

export interface PageOptions {
  cursor?: string;
  limit?: number;
}

export interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

// ============================================================
// User Repository
// ============================================================

export interface UserRepository {
  findById(id: string): Promise<User | null>;
  findByExternalAuthId(externalAuthId: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  upsert(data: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User>;
}

// ============================================================
// Workspace Repository
// ============================================================

export interface WorkspaceRepository {
  create(data: { organizationId: string; name: string; slug: string }): Promise<Workspace>;
  findById(id: string): Promise<Workspace | null>;
  findByOrganizationId(organizationId: string): Promise<Workspace[]>;
  findByUserId(userId: string): Promise<Workspace[]>;
  update(id: string, data: Partial<Pick<Workspace, 'name'>>): Promise<Workspace | null>;
  softDelete(id: string): Promise<void>;
}

// ============================================================
// Membership Repository
// ============================================================

export interface MembershipRepository {
  create(data: Pick<Membership, 'userId' | 'workspaceId' | 'role'>): Promise<Membership>;
  findById(id: string): Promise<Membership | null>;
  findByUserAndWorkspace(userId: string, workspaceId: string): Promise<Membership | null>;
  findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<Membership>>;
  updateRole(id: string, role: Membership['role']): Promise<Membership | null>;
  delete(id: string): Promise<void>;
}

// ============================================================
// Project Repository
// ============================================================

export interface ProjectRepository {
  create(data: {
    workspaceId: string;
    name: string;
    slug: string;
    description?: string;
  }): Promise<Project>;
  findById(id: string): Promise<Project | null>;
  findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<Project>>;
  findByUserId(userId: string, options?: PageOptions): Promise<Page<Project>>;
  /**
   * Project-scoped access check (ADR 013).
   *
   * Returns true if the user has access to the given project.
   * This is the canonical resource-scoped authority primitive —
   * callers must not use workspace membership as the access decision.
   */
  isAccessibleByUser(projectId: string, userId: string): Promise<boolean>;
  update(id: string, data: Partial<Pick<Project, 'name' | 'description'>>): Promise<Project | null>;
  softDelete(id: string): Promise<void>;
}

// ============================================================
// Session Repository
// ============================================================

export interface SessionRepository {
  create(data: {
    projectId: string;
    workspaceId: string;
    userId: string;
    idleTimeoutSeconds?: number;
  }): Promise<Session>;
  findById(id: string): Promise<Session | null>;
  findByProjectId(projectId: string, options?: PageOptions): Promise<Page<Session>>;
  findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<Session>>;
  /** Optimistic concurrency update — fails if version mismatch */
  updateState(
    id: string,
    toState: SessionState,
    expectedVersion: number,
    extraFields?: Partial<Pick<Session, 'workerHost' | 'hostPort' | 'startedAt' | 'stoppedAt' | 'lastActivityAt'>>,
  ): Promise<Session>;
  findIdleBeyond(idleThresholdSeconds: number): Promise<Session[]>;
}

// ============================================================
// Sandbox Lease Repository
// ============================================================

export interface SandboxLeaseRepository {
  create(data: {
    sessionId: string;
    workerHost: string;
    hostPort: number;
    expiresAt: Date;
  }): Promise<SandboxLease>;
  findBySessionId(sessionId: string): Promise<SandboxLease | null>;
  findActiveByHostAndPort(workerHost: string, hostPort: number): Promise<SandboxLease | null>;
  updateState(
    id: string,
    toState: LeaseState,
    expectedVersion: number,
  ): Promise<SandboxLease>;
  findOrphanedLeases(): Promise<SandboxLease[]>;
}

// ============================================================
// Preview Route Repository
// ============================================================

export interface PreviewRouteRepository {
  create(data: {
    previewId: string;
    sessionId: string;
    projectId: string;
    workspaceId: string;
    workerHost: string;
    hostPort: number;
    ttlSeconds?: number;
  }): Promise<PreviewRouteBinding>;
  findByPreviewId(previewId: string): Promise<PreviewRouteBinding | null>;
  findActiveBySessionId(sessionId: string): Promise<PreviewRouteBinding[]>;
  updateState(
    id: string,
    toState: PreviewRouteState,
    expectedVersion: number,
  ): Promise<PreviewRouteBinding>;
  revokeAllForSession(sessionId: string): Promise<void>;
}

// ============================================================
// Worker Capacity Repository
// ============================================================

export interface WorkerCapacityRepository {
  upsertSnapshot(snapshot: WorkerCapacitySnapshot): Promise<void>;
  findAllHealthy(): Promise<WorkerCapacitySnapshot[]>;
  markUnhealthy(workerHost: string): Promise<void>;
}

// ============================================================
// Collaboration Repositories
// ============================================================

export interface CommentRepository {
  createThread(data: {
    projectId: string;
    sessionId?: string;
    anchor: CollaborationThread['anchor'];
  }): Promise<CollaborationThread>;
  findThreadsByProjectId(projectId: string, options?: PageOptions): Promise<Page<CollaborationThread>>;
  createComment(data: Pick<Comment, 'threadId' | 'authorUserId' | 'body'>): Promise<Comment>;
  findCommentsByThreadId(threadId: string): Promise<Comment[]>;
  softDeleteComment(id: string): Promise<void>;
}

// ============================================================
// Audit Log Repository
// ============================================================

export interface AuditLogRepository {
  append(entry: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void>;
  findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<AuditLog>>;
}

// ============================================================
// Usage Meter Repository
// ============================================================

export interface UsageMeterRepository {
  record(event: Omit<UsageMeterEvent, 'id' | 'recordedAt'>): Promise<void>;
  findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<UsageMeterEvent>>;
}

// ============================================================
// AI Orchestration Repositories
// ============================================================

export interface ProviderConfigRepository {
  create(data: Omit<ProviderConfig, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<ProviderConfig>;
  findById(id: string): Promise<ProviderConfig | null>;
  findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<ProviderConfig>>;
  findByUserId(userId: string, options?: PageOptions): Promise<Page<ProviderConfig>>;
  update(id: string, data: Partial<Pick<ProviderConfig, 'name' | 'endpointUrl' | 'modelCatalogMode' | 'isActive' | 'credentialSecretRef'>>): Promise<ProviderConfig | null>;
  softDelete(id: string): Promise<void>;
}

export interface AgentRoleRepository {
  create(data: Omit<AgentRole, 'id' | 'createdAt' | 'updatedAt'>): Promise<AgentRole>;
  findById(id: string): Promise<AgentRole | null>;
  findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<AgentRole>>;
  findByProjectId(projectId: string, options?: PageOptions): Promise<Page<AgentRole>>;
  update(id: string, data: Partial<Pick<AgentRole, 'name' | 'description' | 'modelIdentifier' | 'endpointOverrideUrl' | 'roleConfigJson' | 'isActive'>>): Promise<AgentRole | null>;
  delete(id: string): Promise<void>;
}

export interface PipelineRepository {
  create(data: Omit<PipelineDefinition, 'id' | 'createdAt' | 'updatedAt' | 'pipelineVersion'>): Promise<PipelineDefinition>;
  findById(id: string): Promise<PipelineDefinition | null>;
  findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<PipelineDefinition>>;
  findByProjectId(projectId: string, options?: PageOptions): Promise<Page<PipelineDefinition>>;
  update(id: string, data: Partial<Pick<PipelineDefinition, 'name' | 'description' | 'pipelineDefinitionJson' | 'isActive'>>): Promise<PipelineDefinition | null>;
  delete(id: string): Promise<void>;
}

export interface PipelineRunRepository {
  create(data: Omit<PipelineRunRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<PipelineRunRecord>;
  findById(id: string): Promise<PipelineRunRecord | null>;
  findByIdempotencyKey(pipelineId: string, key: string): Promise<PipelineRunRecord | null>;
  findByWorkspaceId(workspaceId: string, options?: PageOptions): Promise<Page<PipelineRunRecord>>;
  findByProjectId(projectId: string, options?: PageOptions): Promise<Page<PipelineRunRecord>>;
  updateStatus(
    id: string,
    status: PipelineRunStatus,
    extraFields?: Partial<Pick<PipelineRunRecord, 'outputPayloadRef' | 'errorSummary' | 'startedAt' | 'finishedAt'>>,
  ): Promise<PipelineRunRecord>;
  findStuck(preparingTimeoutMs: number, runningTimeoutMs: number): Promise<PipelineRunRecord[]>;
}
