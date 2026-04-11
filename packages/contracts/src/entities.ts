import type {
  SessionState,
  PreviewRouteState,
  LeaseState,
  MembershipRole,
  Permission,
} from './enums.js';

// ============================================================
// Identity
// ============================================================

export interface User {
  id: string;
  externalAuthId: string;
  email: string;
  displayName: string;
  avatarUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Workspace / Membership
// ============================================================

export interface Workspace {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface Membership {
  id: string;
  userId: string;
  workspaceId: string;
  role: MembershipRole;
  createdAt: string;
  updatedAt: string;
}

export interface RoleGrant {
  id: string;
  membershipId: string;
  permission: Permission;
  grantedByUserId: string;
  createdAt: string;
}

// ============================================================
// Projects
// ============================================================

export interface Project {
  id: string;
  workspaceId: string;
  name: string;
  slug: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface ProjectRepo {
  id: string;
  projectId: string;
  provider: 'github' | 'gitlab' | 'bitbucket';
  remoteUrl: string;
  defaultBranch: string;
  connectedAt: string;
}

export interface ProjectEnvironment {
  id: string;
  projectId: string;
  name: string;
  variables: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

// ============================================================
// Secrets (metadata only — never store plaintext)
// ============================================================

export interface SecretMetadata {
  id: string;
  workspaceId: string;
  name: string;
  /** Reference key in external secret manager — never the secret value */
  secretRef: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
  rotatedAt?: string | null;
}

// ============================================================
// Sessions / Sandbox / Preview
// ============================================================

export interface Session {
  id: string;
  projectId: string;
  workspaceId: string;
  userId: string;
  state: SessionState;
  workerHost?: string | null;
  hostPort?: number | null;
  startedAt?: string | null;
  stoppedAt?: string | null;
  lastActivityAt?: string | null;
  idleTimeoutSeconds: number;
  /** Optimistic concurrency version — increment on every state change */
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SandboxLease {
  id: string;
  sessionId: string;
  workerHost: string;
  hostPort: number;
  leaseState: LeaseState;
  leasedAt: string;
  expiresAt: string;
  releasedAt?: string | null;
  /** Optimistic concurrency version */
  version: number;
}

export interface PreviewRouteBinding {
  id: string;
  previewId: string;
  sessionId: string;
  projectId: string;
  workspaceId: string;
  workerHost: string;
  hostPort: number;
  state: PreviewRouteState;
  boundAt: string;
  expiresAt?: string | null;
  revokedAt?: string | null;
  /** Optimistic concurrency version */
  version: number;
}

export interface WorkerCapacitySnapshot {
  workerHost: string;
  totalSlots: number;
  usedSlots: number;
  availablePorts: number[];
  reportedAt: string;
  healthy: boolean;
}

export interface SessionStateTransition {
  sessionId: string;
  fromState: SessionState;
  toState: SessionState;
  reason: string;
  triggeredBy: string;
  timestamp: string;
}

export interface CheckpointManifest {
  id: string;
  sessionId: string;
  projectId: string;
  /** Object storage reference — not a URL */
  snapshotRef: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  createdByUserId: string;
}

// ============================================================
// Collaboration
// ============================================================

export interface CollaborationThread {
  id: string;
  projectId: string;
  sessionId?: string | null;
  anchor: {
    type: 'file' | 'preview' | 'general';
    path?: string;
    line?: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  threadId: string;
  authorUserId: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

// ============================================================
// Observability / Audit
// ============================================================

export interface AuditLog {
  id: string;
  workspaceId: string;
  actorUserId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  /** Must never contain secret values */
  metadata: Record<string, unknown>;
  timestamp: string;
}

export interface UsageMeterEvent {
  id: string;
  workspaceId: string;
  eventType: string;
  resourceId: string;
  quantity: number;
  unit: string;
  metadata: Record<string, unknown>;
  recordedAt: string;
}
