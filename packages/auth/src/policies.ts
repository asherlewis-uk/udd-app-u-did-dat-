import type { AuthContext } from './types.js';
import { hasPermission } from './rbac.js';
import type { Permission } from '@udd/contracts';

// ============================================================
// Project-scoped authorization policies (ADR 013 Phase 2)
//
// Authorization decisions are based on the authenticated user's
// resolved permissions (carried as grantedPermissions in the JWT)
// and user-to-resource access verified via internal tenancy.
//
// Workspace is NOT an authority primitive — it is an internal
// shard/tenancy key only.  See ADR 013 and docs/domain-model.md.
// ============================================================

/**
 * Check if the authenticated user has a specific permission.
 *
 * Permissions are resolved at token-issuance time and embedded in
 * grantedPermissions.  The workspaceRole fallback in hasPermission
 * exists only for backward compatibility with pre-migration tokens.
 */
export function canPerform(ctx: AuthContext, permission: Permission): boolean {
  return hasPermission(ctx, permission);
}
