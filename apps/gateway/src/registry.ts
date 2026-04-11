import { PgPreviewRouteRepository, PgMembershipRepository } from '@udd/database';
import type { PreviewRouteRegistry } from './proxy.js';
import type { PreviewRouteBinding } from '@udd/contracts';

// ============================================================
// DB-backed PreviewRouteRegistry
//
// Every preview access check hits the authoritative PostgreSQL record.
// No caching is permitted — the security model requires DB-authoritative lookups.
// ============================================================

export class PgPreviewRouteRegistry implements PreviewRouteRegistry {
  private readonly routes: PgPreviewRouteRepository;
  private readonly memberships: PgMembershipRepository;

  constructor() {
    this.routes = new PgPreviewRouteRepository();
    this.memberships = new PgMembershipRepository();
  }

  async findActiveRoute(previewId: string): Promise<PreviewRouteBinding | null> {
    return this.routes.findByPreviewId(previewId);
  }

  async isMember(userId: string, workspaceId: string): Promise<boolean> {
    const membership = await this.memberships.findByUserAndWorkspace(userId, workspaceId);
    return membership !== null;
  }
}
