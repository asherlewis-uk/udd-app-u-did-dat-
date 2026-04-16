import { describe, it, expect } from 'vitest';
import { authorizePreviewRequest } from './proxy.js';
import { makePreviewRoute, makeUser } from '@udd/testing';
import type { PreviewRouteRegistry } from './proxy.js';
import type { AuthContext } from '@udd/auth';

function makeAuthContext(overrides: Partial<AuthContext> = {}): AuthContext {
  return {
    userId: makeUser().id,
    email: 'test@example.com',
    displayName: 'Test User',
    grantedPermissions: [],
    ...overrides,
  };
}

function makeRegistry(overrides: Partial<PreviewRouteRegistry> = {}): PreviewRouteRegistry {
  return {
    findActiveRoute: async () => null,
    canAccessProject: async () => true,
    ...overrides,
  };
}

describe('authorizePreviewRequest', () => {
  it('denies when preview route is not found', async () => {
    const auth = makeAuthContext();
    const registry = makeRegistry({ findActiveRoute: async () => null });

    const result = await authorizePreviewRequest('nonexistent', auth, registry, 'corr-1');
    expect(result.allowed).toBe(false);
    expect(result.denyCode).toBe('PREVIEW_NOT_FOUND');
  });

  it('denies when route state is revoked', async () => {
    const binding = makePreviewRoute({ state: 'revoked' });
    const auth = makeAuthContext();
    const registry = makeRegistry({ findActiveRoute: async () => binding });

    const result = await authorizePreviewRequest(binding.previewId, auth, registry, 'corr-2');
    expect(result.allowed).toBe(false);
    expect(result.denyCode).toBe('PREVIEW_REVOKED');
  });

  it('denies when route has expired', async () => {
    const binding = makePreviewRoute({
      state: 'active',
      expiresAt: new Date(Date.now() - 10_000).toISOString(), // 10 seconds ago
    });
    const auth = makeAuthContext();
    const registry = makeRegistry({ findActiveRoute: async () => binding });

    const result = await authorizePreviewRequest(binding.previewId, auth, registry, 'corr-3');
    expect(result.allowed).toBe(false);
    expect(result.denyCode).toBe('PREVIEW_EXPIRED');
  });

  it('denies when user cannot access project', async () => {
    const binding = makePreviewRoute({ state: 'active', expiresAt: null });
    const auth = makeAuthContext();
    const registry = makeRegistry({
      findActiveRoute: async () => binding,
      canAccessProject: async () => false,
    });

    const result = await authorizePreviewRequest(binding.previewId, auth, registry, 'corr-4');
    expect(result.allowed).toBe(false);
    expect(result.denyCode).toBe('FORBIDDEN');
  });

  it('allows when all checks pass and returns correct target', async () => {
    const binding = makePreviewRoute({
      state: 'active',
      expiresAt: null,
      workerHost: 'worker-042.internal',
      hostPort: 32100,
    });
    const auth = makeAuthContext();
    const registry = makeRegistry({
      findActiveRoute: async () => binding,
      canAccessProject: async () => true,
    });

    const result = await authorizePreviewRequest(binding.previewId, auth, registry, 'corr-5');
    expect(result.allowed).toBe(true);
    expect(result.target).toEqual({ host: 'worker-042.internal', port: 32100 });
  });

  it('allows when route has a future expiry', async () => {
    const binding = makePreviewRoute({
      state: 'active',
      expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
    });
    const auth = makeAuthContext();
    const registry = makeRegistry({ findActiveRoute: async () => binding });

    const result = await authorizePreviewRequest(binding.previewId, auth, registry, 'corr-6');
    expect(result.allowed).toBe(true);
  });

  it('denies when route state is binding (not yet active)', async () => {
    const binding = makePreviewRoute({ state: 'binding' });
    const auth = makeAuthContext();
    const registry = makeRegistry({ findActiveRoute: async () => binding });

    const result = await authorizePreviewRequest(binding.previewId, auth, registry, 'corr-7');
    expect(result.allowed).toBe(false);
  });
});
