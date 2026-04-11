import {
  PgUserRepository,
  PgWorkspaceRepository,
  PgMembershipRepository,
  PgProjectRepository,
  PgSessionRepository,
  PgPreviewRouteRepository,
  PgAuditLogRepository,
  PgCommentRepository,
} from '@udd/database';
import type {
  UserRepository,
  WorkspaceRepository,
  MembershipRepository,
  ProjectRepository,
  AuditLogRepository,
  CommentRepository,
} from '@udd/database';
import { NoopEventPublisher } from '@udd/events';
import type { EventPublisher } from '@udd/events';
import { WorkOSAuthProvider } from '@udd/adapters';

export interface ApiContext {
  users: UserRepository;
  workspaces: WorkspaceRepository;
  memberships: MembershipRepository;
  projects: ProjectRepository;
  // Typed as concrete classes (not abstract interfaces) so that callers can
  // use the transactional overloads (client?: PoolClient) without a cast.
  sessions: PgSessionRepository;
  previewRoutes: PgPreviewRouteRepository;
  auditLogs: AuditLogRepository;
  comments: CommentRepository;
  events: EventPublisher;
  auth: WorkOSAuthProvider;
}

let _ctx: ApiContext | null = null;

export function getContext(): ApiContext {
  if (!_ctx) {
    _ctx = {
      users: new PgUserRepository(),
      workspaces: new PgWorkspaceRepository(),
      memberships: new PgMembershipRepository(),
      projects: new PgProjectRepository(),
      sessions: new PgSessionRepository(),
      previewRoutes: new PgPreviewRouteRepository(),
      auditLogs: new PgAuditLogRepository(),
      comments: new PgCommentRepository(),
      events: new NoopEventPublisher(), // Phase 3: swap for PubSubEventPublisher
      auth: new WorkOSAuthProvider(),
    };
  }
  return _ctx;
}

/** Override context — used in tests */
export function setContext(ctx: ApiContext): void {
  _ctx = ctx;
}
