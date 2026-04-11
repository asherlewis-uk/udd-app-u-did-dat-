// ============================================================
// Platform Enums — source of truth for all state machines
// ============================================================

export type SessionState =
  | 'creating'
  | 'starting'
  | 'running'
  | 'idle'
  | 'stopping'
  | 'stopped'
  | 'failed';

export type PreviewRouteState = 'binding' | 'active' | 'revoking' | 'revoked' | 'expired';

export type LeaseState = 'pending' | 'active' | 'releasing' | 'released' | 'orphaned';

export type MembershipRole =
  | 'org_owner'
  | 'workspace_admin'
  | 'workspace_member'
  | 'project_editor'
  | 'project_viewer';

export type Permission =
  | 'workspace.create'
  | 'workspace.read'
  | 'workspace.update'
  | 'workspace.delete'
  | 'project.create'
  | 'project.read'
  | 'project.update'
  | 'project.delete'
  | 'session.create'
  | 'session.start'
  | 'session.stop'
  | 'preview.create'
  | 'preview.read'
  | 'preview.delete'
  | 'member.invite'
  | 'member.remove'
  | 'member.update_role'
  | 'comment.create'
  | 'comment.read'
  | 'comment.delete'
  | 'ai.provider.create'
  | 'ai.provider.read'
  | 'ai.provider.update'
  | 'ai.provider.delete'
  | 'ai.provider.rotate_secret'
  | 'ai.role.create'
  | 'ai.role.read'
  | 'ai.role.update'
  | 'ai.role.delete'
  | 'ai.pipeline.create'
  | 'ai.pipeline.read'
  | 'ai.pipeline.update'
  | 'ai.pipeline.delete'
  | 'ai.pipeline.execute'
  | 'ai.run.read'
  | 'ai.run.cancel'
  | 'audit.read'
  | 'admin.workers'
  | 'admin.sessions'
  | 'admin.previews';

// AI Orchestration enums
export type ProviderType =
  | 'anthropic'
  | 'openai'
  | 'google'
  | 'openai_compatible'
  | 'self_hosted';

export type PipelineRunStatus =
  | 'queued'
  | 'preparing'
  | 'running'
  | 'succeeded'
  | 'failed'
  | 'canceled';

export type PipelineRunSourceType = 'manual' | 'api' | 'system';

export type AuthScheme = 'api_key_header' | 'bearer_token' | 'custom_header';

export type ModelCatalogMode = 'manual' | 'discovered_later';

// Valid SESSION_STATE transitions — used for optimistic concurrency validation
export const SESSION_TRANSITIONS: Record<SessionState, SessionState[]> = {
  creating: ['starting', 'failed'],
  starting: ['running', 'failed'],
  running: ['idle', 'stopping', 'failed'],
  idle: ['running', 'stopping', 'failed'],
  stopping: ['stopped', 'failed'],
  stopped: [],
  failed: [],
};

export const PIPELINE_RUN_TRANSITIONS: Record<PipelineRunStatus, PipelineRunStatus[]> = {
  queued: ['preparing', 'canceled'],
  preparing: ['running', 'failed', 'canceled'],
  running: ['succeeded', 'failed', 'canceled'],
  succeeded: [],
  failed: [],
  canceled: [],
};
