import type {
  ProviderConfig,
  ProviderConfigPublicView,
  AgentRole,
  AgentRoleView,
  PipelineDefinition,
  PipelineView,
  PipelineRunRecord,
  PipelineRunView,
} from '@udd/contracts';

export function mapProviderConfigView(provider: ProviderConfig, credentialStatus: ProviderConfigPublicView['credentialStatus'], lastRotatedAt?: string | null): ProviderConfigPublicView {
  return {
    id: provider.id,
    createdByUserId: provider.createdByUserId,
    name: provider.name,
    providerType: provider.providerType,
    endpointUrl: provider.endpointUrl,
    modelCatalogMode: provider.modelCatalogMode,
    authScheme: provider.authScheme,
    isActive: provider.isActive,
    isSystemManaged: provider.isSystemManaged,
    credentialStatus,
    lastRotatedAt: lastRotatedAt ?? null,
    createdAt: provider.createdAt,
    updatedAt: provider.updatedAt,
  };
}

export function mapAgentRoleView(role: AgentRole): AgentRoleView {
  return {
    id: role.id,
    projectId: role.projectId ?? null,
    createdByUserId: role.createdByUserId,
    name: role.name,
    description: role.description ?? null,
    providerConfigId: role.providerConfigId,
    modelIdentifier: role.modelIdentifier,
    endpointOverrideUrl: role.endpointOverrideUrl ?? null,
    roleConfigJson: role.roleConfigJson,
    isActive: role.isActive,
    createdAt: role.createdAt,
    updatedAt: role.updatedAt,
  };
}

export function mapPipelineView(pipeline: PipelineDefinition): PipelineView {
  return {
    id: pipeline.id,
    projectId: pipeline.projectId ?? null,
    createdByUserId: pipeline.createdByUserId,
    name: pipeline.name,
    description: pipeline.description ?? null,
    pipelineVersion: pipeline.pipelineVersion,
    pipelineDefinitionJson: pipeline.pipelineDefinitionJson as any,
    ...(pipeline.inputSchemaJson != null && { inputSchemaJson: pipeline.inputSchemaJson }),
    ...(pipeline.outputSchemaJson != null && { outputSchemaJson: pipeline.outputSchemaJson }),
    isActive: pipeline.isActive,
    createdAt: pipeline.createdAt,
    updatedAt: pipeline.updatedAt,
  };
}

export function mapPipelineRunView(run: PipelineRunRecord): PipelineRunView {
  return {
    id: run.id,
    projectId: run.projectId ?? null,
    pipelineId: run.pipelineId,
    triggeredByUserId: run.triggeredByUserId,
    sourceType: run.sourceType,
    status: run.status,
    errorSummary: run.errorSummary ?? null,
    startedAt: run.startedAt ?? null,
    finishedAt: run.finishedAt ?? null,
    createdAt: run.createdAt,
    updatedAt: run.updatedAt,
  };
}
