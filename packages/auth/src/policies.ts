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

/**
 * Verify the user has access to a resource's tenancy scope.
 *
 * In the solo-first model, this checks that the user is a member
 * of the tenancy scope (home workspace) that owns the resource.
 * This is an internal tenancy check — the workspace is a
 * shard/persistence key per ADR 013, not an authority primitive.
 *
 * @param userId - The authenticated user's ID
 * @param resourceWorkspaceId - The workspace_id from the resource's internal data
 * @param membershipLookup - Function to check internal tenancy membership
 * @returns true if the user has access to the resource's tenancy scope
 */
export async function verifyResourceAccess(
  userId: string,
  resourceWorkspaceId: string,
  membershipLookup: (userId: string, workspaceId: string) => Promise<unknown | null>,
): Promise<boolean> {
  const membership = await membershipLookup(userId, resourceWorkspaceId);
  return membership !== null;
}
