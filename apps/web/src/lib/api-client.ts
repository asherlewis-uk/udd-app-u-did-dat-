// ============================================================
// Typed API client — wraps all platform API calls
// Phase 2: connect to real endpoints
// ============================================================

import type {
  ExchangeTokenRequest, ExchangeTokenResponse,
  MeResponse, CreateWorkspaceRequest, CreateProjectRequest,
  CreateSessionRequest, CreatePreviewRequest,
  CreateProviderConfigRequest, UpdateProviderConfigRequest,
  RotateSecretRequest, CreateAgentRoleRequest,
  CreatePipelineRequest, CreatePipelineRunRequest,
  ApiResponse, PaginatedResponse,
} from '@udd/contracts';
import type { Workspace, Project, Session, PreviewRouteBinding } from '@udd/contracts';
import type { ProviderConfig, AgentRole, PipelineDefinition, PipelineRunRecord } from '@udd/contracts';

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] ?? '/v1';

export class ApiClient {
  private readonly baseUrl: string;
  private sessionToken: string | null = null;

  constructor(baseUrl = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  setSessionToken(token: string): void {
    this.sessionToken = token;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { correlationId?: string },
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.sessionToken) {
      headers['Authorization'] = `Bearer ${this.sessionToken}`;
    }
    if (options?.correlationId) {
      headers['x-correlation-id'] = options.correlationId;
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : null,
    });

    const json = await res.json() as T;

    if (!res.ok) {
      throw Object.assign(new Error((json as { message?: string }).message ?? 'API error'), {
        status: res.status,
        body: json,
      });
    }

    return json;
  }

  // Auth
  exchangeToken(req: ExchangeTokenRequest): Promise<ExchangeTokenResponse> {
    return this.request('POST', '/auth/session/exchange', req);
  }

  getMe(): Promise<ApiResponse<MeResponse>> {
    return this.request('GET', '/me');
  }

  // Workspaces
  listWorkspaces(): Promise<PaginatedResponse<Workspace>> {
    return this.request('GET', '/workspaces');
  }

  createWorkspace(req: CreateWorkspaceRequest): Promise<ApiResponse<Workspace>> {
    return this.request('POST', '/workspaces', req);
  }

  getWorkspace(id: string): Promise<ApiResponse<Workspace>> {
    return this.request('GET', `/workspaces/${id}`);
  }

  // Projects
  listProjects(workspaceId: string): Promise<PaginatedResponse<Project>> {
    return this.request('GET', `/workspaces/${workspaceId}/projects`);
  }

  createProject(workspaceId: string, req: CreateProjectRequest): Promise<ApiResponse<Project>> {
    return this.request('POST', `/workspaces/${workspaceId}/projects`, req);
  }

  // Sessions
  createSession(projectId: string, req?: CreateSessionRequest): Promise<ApiResponse<Session>> {
    return this.request('POST', `/projects/${projectId}/sessions`, req ?? {});
  }

  startSession(sessionId: string): Promise<ApiResponse<Session>> {
    return this.request('POST', `/sessions/${sessionId}/start`, {});
  }

  stopSession(sessionId: string): Promise<ApiResponse<Session>> {
    return this.request('POST', `/sessions/${sessionId}/stop`, {});
  }

  // Previews
  createPreview(sessionId: string, req: CreatePreviewRequest): Promise<ApiResponse<PreviewRouteBinding>> {
    return this.request('POST', `/sessions/${sessionId}/previews`, req);
  }

  // AI Providers
  listProviders(): Promise<PaginatedResponse<ProviderConfig>> {
    return this.request('GET', `/me/ai/providers`);
  }

  createProvider(req: CreateProviderConfigRequest): Promise<ApiResponse<ProviderConfig>> {
    return this.request('POST', `/me/ai/providers`, req);
  }

  updateProvider(providerId: string, req: UpdateProviderConfigRequest): Promise<ApiResponse<ProviderConfig>> {
    return this.request('PATCH', `/me/ai/providers/${providerId}`, req);
  }

  rotateProviderSecret(providerId: string, req: RotateSecretRequest): Promise<ApiResponse<void>> {
    return this.request('POST', `/me/ai/providers/${providerId}/rotate-secret`, req);
  }

  deleteProvider(providerId: string): Promise<ApiResponse<void>> {
    return this.request('DELETE', `/me/ai/providers/${providerId}`);
  }

  // AI Roles
  listRoles(projectId: string): Promise<PaginatedResponse<AgentRole>> {
    return this.request('GET', `/projects/${projectId}/ai/roles`);
  }

  createRole(projectId: string, req: CreateAgentRoleRequest): Promise<ApiResponse<AgentRole>> {
    return this.request('POST', `/projects/${projectId}/ai/roles`, req);
  }

  // AI Pipelines
  listPipelines(projectId: string): Promise<PaginatedResponse<PipelineDefinition>> {
    return this.request('GET', `/projects/${projectId}/ai/pipelines`);
  }

  createPipeline(projectId: string, req: CreatePipelineRequest): Promise<ApiResponse<PipelineDefinition>> {
    return this.request('POST', `/projects/${projectId}/ai/pipelines`, req);
  }

  // Pipeline Runs
  listRuns(projectId: string): Promise<PaginatedResponse<PipelineRunRecord>> {
    return this.request('GET', `/projects/${projectId}/ai/runs`);
  }

  createRun(projectId: string, pipelineId: string, req: CreatePipelineRunRequest): Promise<ApiResponse<PipelineRunRecord>> {
    return this.request('POST', `/projects/${projectId}/ai/pipelines/${pipelineId}/runs`, req);
  }

  cancelRun(projectId: string, runId: string): Promise<ApiResponse<PipelineRunRecord>> {
    return this.request('POST', `/projects/${projectId}/ai/runs/${runId}/cancel`, {});
  }

  // PKCE init — returns state nonce and code challenge for WorkOS auth redirect
  async pkceInit(): Promise<{ data: { state: string; codeChallenge: string; codeChallengeMethod: string } }> {
    return this.request('POST', '/auth/session/pkce-init');
  }

  // Exchange authorization code + PKCE state for a session JWT
  async exchangeCode(code: string, state: string): Promise<{ data: { token: string; userId: string } }> {
    return this.request('POST', '/auth/session/exchange', { code, state });
  }
}

// Singleton for client-side usage
export const apiClient = new ApiClient();
