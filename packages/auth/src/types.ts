import type { MembershipRole, Permission } from '@udd/contracts';

export interface SessionClaims {
  /** Internal user ID (UUID) */
  sub: string;
  /** User email */
  email: string;
  /** Display name */
  displayName: string;
  /**
   * @deprecated Internal tenancy key only. Not an authority primitive.
   * Retained for backward compatibility with pre-migration tokens.
   * New tokens should not include this field (ADR 013 Phase 2).
   */
  workspaceId?: string;
  /**
   * @deprecated Retained for backward compatibility with pre-migration tokens.
   * New tokens carry resolved permissions in grantedPermissions instead.
   */
  workspaceRole?: MembershipRole;
  /** Resolved permission set — primary authority source for permission checks */
  grantedPermissions?: Permission[];
  /** Token issued-at and expiry (epoch seconds) */
  iat: number;
  exp: number;
}

export interface AuthContext {
  userId: string;
  email: string;
  displayName: string;
  /**
   * @deprecated Internal tenancy key only. Not an authority primitive.
   * Retained for backward compatibility with pre-migration tokens (ADR 013).
   */
  workspaceId?: string;
  /**
   * @deprecated Retained for backward compatibility with pre-migration tokens.
   * New tokens carry resolved permissions in grantedPermissions instead.
   */
  workspaceRole?: MembershipRole;
  /** Resolved permission set — primary authority source for permission checks */
  grantedPermissions: Permission[];
}

/** Roles that exist but are not a MembershipRole — internal service identities */
export type InternalRole = 'support_admin' | 'service_account';
