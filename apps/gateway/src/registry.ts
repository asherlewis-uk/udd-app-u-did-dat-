import { PgPreviewRouteRepository, PgProjectRepository } from '@udd/database';
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
  private readonly projects: PgProjectRepository;

  constructor() {
    this.routes = new PgPreviewRouteRepository();
    this.projects = new PgProjectRepository();
  }

  async findActiveRoute(previewId: string): Promise<PreviewRouteBinding | null> {
    return this.routes.findByPreviewId(previewId);
  }

  async canAccessProject(userId: string, projectId: string): Promise<boolean> {
    return this.projects.isAccessibleByUser(projectId, userId);
  }
}
