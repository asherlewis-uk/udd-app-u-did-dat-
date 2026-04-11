import type { MembershipRole, Permission } from '@udd/contracts';

export interface SessionClaims {
  /** Internal user ID (UUID) */
  sub: string;
  /** User email */
  email: string;
  /** Display name */
  displayName: string;
  /** Workspace context (may be empty if cross-workspace request) */
  workspaceId?: string;
  /** Membership role in the current workspace context */
  workspaceRole?: MembershipRole;
  /** Explicit permission grants beyond role defaults */
  grantedPermissions?: Permission[];
  /** Token issued-at and expiry (epoch seconds) */
  iat: number;
  exp: number;
}

export interface AuthContext {
  userId: string;
  email: string;
  displayName: string;
  workspaceId?: string;
  workspaceRole?: MembershipRole;
  grantedPermissions: Permission[];
}

export interface WorkspaceAuthContext extends AuthContext {
  workspaceId: string;
  workspaceRole: MembershipRole;
}

/** Roles that exist but are not a MembershipRole — internal service identities */
export type InternalRole = 'support_admin' | 'service_account';
