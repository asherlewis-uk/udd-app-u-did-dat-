import { describe, it, expect } from 'vitest';
import { hasPermission } from './rbac.js';
import type { AuthContext } from './types.js';
import type { MembershipRole, Permission } from '@udd/contracts';

function makeAuthCtx(
  role: MembershipRole,
  grantedPermissions: Permission[] = [],
): AuthContext {
  return {
    userId: 'user-test',
    email: 'test@example.com',
    displayName: 'Test',
    workspaceId: 'ws-test',
    workspaceRole: role,
    grantedPermissions,
  };
}

describe('hasPermission', () => {
  describe('project_viewer', () => {
    const ctx = makeAuthCtx('project_viewer');

    it('can read workspace', () => expect(hasPermission(ctx, 'workspace.read')).toBe(true));
    it('can read project', () => expect(hasPermission(ctx, 'project.read')).toBe(true));
    it('cannot create project', () => expect(hasPermission(ctx, 'project.create')).toBe(false));
    it('cannot create session', () => expect(hasPermission(ctx, 'session.create')).toBe(false));
    it('cannot create AI provider', () => expect(hasPermission(ctx, 'ai.provider.create')).toBe(false));
  });

  describe('project_editor', () => {
    const ctx = makeAuthCtx('project_editor');

    it('can create session', () => expect(hasPermission(ctx, 'session.create')).toBe(true));
    it('can start session', () => expect(hasPermission(ctx, 'session.start')).toBe(true));
    it('can stop session', () => expect(hasPermission(ctx, 'session.stop')).toBe(true));
    it('can create preview', () => expect(hasPermission(ctx, 'preview.create')).toBe(true));
    it('cannot create workspace', () => expect(hasPermission(ctx, 'workspace.create')).toBe(false));
    it('cannot read audit logs', () => expect(hasPermission(ctx, 'audit.read')).toBe(false));
  });

  describe('workspace_admin', () => {
    const ctx = makeAuthCtx('workspace_admin');

    it('can create AI provider', () => expect(hasPermission(ctx, 'ai.provider.create')).toBe(true));
    it('can read audit logs', () => expect(hasPermission(ctx, 'audit.read')).toBe(true));
    it('can admin sessions', () => expect(hasPermission(ctx, 'admin.sessions')).toBe(true));
    it('cannot manage workers', () => expect(hasPermission(ctx, 'admin.workers')).toBe(false));
  });

  describe('org_owner', () => {
    const ctx = makeAuthCtx('org_owner');

    it('can manage workers', () => expect(hasPermission(ctx, 'admin.workers')).toBe(true));
    it('can do everything', () => {
      const allPermissions: Permission[] = [
        'workspace.create', 'workspace.read', 'project.create', 'project.read',
        'session.create', 'session.start', 'session.stop', 'preview.create',
        'audit.read', 'admin.workers', 'admin.sessions',
      ];
      for (const perm of allPermissions) {
        expect(hasPermission(ctx, perm)).toBe(true);
      }
    });
  });

  describe('explicit grants', () => {
    it('grants additional permission beyond role', () => {
      const ctx = makeAuthCtx('project_viewer', ['audit.read']);
      expect(hasPermission(ctx, 'audit.read')).toBe(true);
    });

    it('does not affect permissions not in the grant list', () => {
      const ctx = makeAuthCtx('project_viewer', ['audit.read']);
      expect(hasPermission(ctx, 'admin.workers')).toBe(false);
    });
  });

  describe('no auth context', () => {
    it('denies all permissions when no workspace role is set', () => {
      const ctx: AuthContext = {
        userId: 'u-1',
        email: 'x@x.com',
        displayName: 'X',
        grantedPermissions: [],
        // no workspaceRole
      };
      expect(hasPermission(ctx, 'workspace.read')).toBe(false);
    });
  });

  describe('grantedPermissions-only (ADR 013 Phase 2)', () => {
    // New tokens carry grantedPermissions without workspaceRole.
    // hasPermission must respect grantedPermissions even when
    // workspaceRole is absent.
    function makePermOnlyCtx(perms: Permission[]): AuthContext {
      return {
        userId: 'u-perm',
        email: 'perm@example.com',
        displayName: 'PermOnly',
        grantedPermissions: perms,
        // no workspaceId, no workspaceRole
      };
    }

    it('grants permission present in grantedPermissions', () => {
      const ctx = makePermOnlyCtx(['project.read', 'session.create']);
      expect(hasPermission(ctx, 'project.read')).toBe(true);
      expect(hasPermission(ctx, 'session.create')).toBe(true);
    });

    it('denies permission not present in grantedPermissions', () => {
      const ctx = makePermOnlyCtx(['project.read']);
      expect(hasPermission(ctx, 'admin.workers')).toBe(false);
      expect(hasPermission(ctx, 'session.create')).toBe(false);
    });

    it('denies all when grantedPermissions is empty and no role', () => {
      const ctx = makePermOnlyCtx([]);
      expect(hasPermission(ctx, 'project.read')).toBe(false);
      expect(hasPermission(ctx, 'workspace.read')).toBe(false);
    });
  });
});
