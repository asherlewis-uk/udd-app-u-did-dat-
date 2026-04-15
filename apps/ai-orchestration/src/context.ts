import {
  PgProviderConfigRepository,
  PgAgentRoleRepository,
  PgPipelineRepository,
  PgPipelineRunRepository,
  PgMembershipRepository,
  PgAuditLogRepository,
  PgProjectRepository,
  PgWorkspaceRepository,
} from '@udd/database';
import type {
  ProviderConfigRepository,
  AgentRoleRepository,
  PipelineRepository,
  PipelineRunRepository,
  MembershipRepository,
  AuditLogRepository,
  ProjectRepository,
  WorkspaceRepository,
} from '@udd/database';
import { createEventPublisher } from '@udd/events';
import type { EventPublisher } from '@udd/events';
import { InMemorySecretManagerProvider, GCPSecretManagerProvider } from '@udd/adapters';
import type { SecretManagerProvider } from '@udd/adapters';
import { resolveAdapterForConfig } from '@udd/adapters';
import type { ModelProviderAdapter, ProviderConfig } from '@udd/contracts';

export interface AiOrchestratorContext {
  providerConfigs: ProviderConfigRepository;
  agentRoles: AgentRoleRepository;
  pipelines: PipelineRepository;
  pipelineRuns: PipelineRunRepository;
  memberships: MembershipRepository;
  auditLogs: AuditLogRepository;
  projects: ProjectRepository;
  workspaces: WorkspaceRepository;
  events: EventPublisher;
  secrets: SecretManagerProvider;
  resolveAdapter(config: ProviderConfig): ModelProviderAdapter;
}

let _ctx: AiOrchestratorContext | null = null;

export function getContext(): AiOrchestratorContext {
  if (!_ctx) {
    const secrets: SecretManagerProvider =
      process.env['NODE_ENV'] === 'production'
        ? new GCPSecretManagerProvider()
        : new InMemorySecretManagerProvider();

    _ctx = {
      providerConfigs: new PgProviderConfigRepository(),
      agentRoles: new PgAgentRoleRepository(),
      pipelines: new PgPipelineRepository(),
      pipelineRuns: new PgPipelineRunRepository(),
      memberships: new PgMembershipRepository(),
      auditLogs: new PgAuditLogRepository(),
      projects: new PgProjectRepository(),
      workspaces: new PgWorkspaceRepository(),
      events: createEventPublisher(),
      secrets,
      resolveAdapter: resolveAdapterForConfig,
    };
  }
  return _ctx;
}

export function setContext(ctx: AiOrchestratorContext): void {
  _ctx = ctx;
}
