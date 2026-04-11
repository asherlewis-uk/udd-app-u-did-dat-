import type { AuthContext, WorkspaceAuthContext } from './types.js';
import { hasPermission } from './rbac.js';

/**
 * Verify the auth context has a workspace context matching the given workspaceId.
 * Returns typed WorkspaceAuthContext if valid, null otherwise.
 */
export function requireWorkspaceContext(
  ctx: AuthContext,
  workspaceId: string,
): WorkspaceAuthContext | null {
  if (ctx.workspaceId !== workspaceId || !ctx.workspaceRole) {
    return null;
  }
  return ctx as WorkspaceAuthContext;
}

/**
 * Check if the user can read a given project.
 * User must be in the workspace and have project.read permission.
 */
export function canReadProject(ctx: AuthContext, workspaceId: string): boolean {
  if (ctx.workspaceId !== workspaceId) return false;
  return hasPermission(ctx, 'project.read');
}

/**
 * Check if the user can manage (create/update/delete) a project.
 */
export function canManageProject(ctx: AuthContext, workspaceId: string): boolean {
  if (ctx.workspaceId !== workspaceId) return false;
  return hasPermission(ctx, 'project.update');
}

/**
 * Check if user can create or manage sessions.
 */
export function canManageSession(ctx: AuthContext, workspaceId: string): boolean {
  if (ctx.workspaceId !== workspaceId) return false;
  return hasPermission(ctx, 'session.create');
}

/**
 * Check if user can access preview routes.
 * Requires: authenticated + in correct workspace + preview.read permission.
 */
export function canAccessPreview(ctx: AuthContext, workspaceId: string): boolean {
  if (ctx.workspaceId !== workspaceId) return false;
  return hasPermission(ctx, 'preview.read');
}

/**
 * Check if user can manage AI providers.
 */
export function canManageProviders(ctx: AuthContext, workspaceId: string): boolean {
  if (ctx.workspaceId !== workspaceId) return false;
  return hasPermission(ctx, 'ai.provider.create');
}

/**
 * Check if user can execute pipelines.
 */
export function canExecutePipeline(ctx: AuthContext, workspaceId: string): boolean {
  if (ctx.workspaceId !== workspaceId) return false;
  return hasPermission(ctx, 'ai.pipeline.execute');
}

/**
 * Check if user can access admin/ops surfaces.
 */
export function canAccessAdminWorkers(ctx: AuthContext, workspaceId: string): boolean {
  if (ctx.workspaceId !== workspaceId) return false;
  return hasPermission(ctx, 'admin.workers');
}
