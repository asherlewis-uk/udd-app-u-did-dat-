import type { MembershipRole, Permission } from '@udd/contracts';
import type { AuthContext } from './types.js';

// ============================================================
// Role → Permission mapping
// Each role includes all permissions of the roles below it.
// ============================================================

const ROLE_PERMISSIONS: Record<MembershipRole, readonly Permission[]> = {
  project_viewer: [
    'workspace.read',
    'project.read',
    'preview.read',
    'comment.read',
    'ai.provider.read',
    'ai.role.read',
    'ai.pipeline.read',
    'ai.run.read',
  ],

  project_editor: [
    'workspace.read',
    'project.read',
    'project.update',
    'session.create',
    'session.start',
    'session.stop',
    'preview.create',
    'preview.read',
    'preview.delete',
    'comment.create',
    'comment.read',
    'comment.delete',
    'ai.provider.read',
    'ai.role.read',
    'ai.pipeline.read',
    'ai.pipeline.execute',
    'ai.run.read',
    'ai.run.cancel',
  ],

  workspace_member: [
    'workspace.read',
    'project.create',
    'project.read',
    'project.update',
    'project.delete',
    'session.create',
    'session.start',
    'session.stop',
    'preview.create',
    'preview.read',
    'preview.delete',
    'comment.create',
    'comment.read',
    'comment.delete',
    'ai.provider.read',
    'ai.role.read',
    'ai.pipeline.read',
    'ai.pipeline.execute',
    'ai.run.read',
    'ai.run.cancel',
  ],

  workspace_admin: [
    'workspace.read',
    'workspace.update',
    'project.create',
    'project.read',
    'project.update',
    'project.delete',
    'session.create',
    'session.start',
    'session.stop',
    'preview.create',
    'preview.read',
    'preview.delete',
    'member.invite',
    'member.remove',
    'member.update_role',
    'comment.create',
    'comment.read',
    'comment.delete',
    'ai.provider.create',
    'ai.provider.read',
    'ai.provider.update',
    'ai.provider.delete',
    'ai.provider.rotate_secret',
    'ai.role.create',
    'ai.role.read',
    'ai.role.update',
    'ai.role.delete',
    'ai.pipeline.create',
    'ai.pipeline.read',
    'ai.pipeline.update',
    'ai.pipeline.delete',
    'ai.pipeline.execute',
    'ai.run.read',
    'ai.run.cancel',
    'audit.read',
    'admin.sessions',
    'admin.previews',
  ],

  org_owner: [
    'workspace.create',
    'workspace.read',
    'workspace.update',
    'workspace.delete',
    'project.create',
    'project.read',
    'project.update',
    'project.delete',
    'session.create',
    'session.start',
    'session.stop',
    'preview.create',
    'preview.read',
    'preview.delete',
    'member.invite',
    'member.remove',
    'member.update_role',
    'comment.create',
    'comment.read',
    'comment.delete',
    'ai.provider.create',
    'ai.provider.read',
    'ai.provider.update',
    'ai.provider.delete',
    'ai.provider.rotate_secret',
    'ai.role.create',
    'ai.role.read',
    'ai.role.update',
    'ai.role.delete',
    'ai.pipeline.create',
    'ai.pipeline.read',
    'ai.pipeline.update',
    'ai.pipeline.delete',
    'ai.pipeline.execute',
    'ai.run.read',
    'ai.run.cancel',
    'audit.read',
    'admin.workers',
    'admin.sessions',
    'admin.previews',
  ],
};

/**
 * Check whether the given auth context has a specific permission.
 * Combines role-based permissions with explicit grants.
 */
export function hasPermission(ctx: AuthContext, permission: Permission): boolean {
  // Explicit grants (additional permissions beyond role)
  if (ctx.grantedPermissions.includes(permission)) {
    return true;
  }

  if (!ctx.workspaceRole) {
    return false;
  }

  const rolePerms = ROLE_PERMISSIONS[ctx.workspaceRole];
  return rolePerms.includes(permission);
}

/**
 * Returns all effective permissions for an auth context.
 */
export function getEffectivePermissions(ctx: AuthContext): Permission[] {
  const rolePerms: Permission[] = ctx.workspaceRole
    ? ([...ROLE_PERMISSIONS[ctx.workspaceRole]] as Permission[])
    : [];

  const combined = new Set<Permission>([...rolePerms, ...ctx.grantedPermissions]);
  return [...combined];
}

export { ROLE_PERMISSIONS };
