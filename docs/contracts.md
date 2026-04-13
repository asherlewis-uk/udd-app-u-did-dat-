# Contracts and Integration Points

All shared types are defined in `packages/contracts/src/`. This package is the authoritative contract between services. When types in `contracts/` change, all consumers must be updated.

---

## State Machines

Defined in `packages/contracts/src/enums.ts`.

### Session state transitions (`SESSION_TRANSITIONS`)

| From | Valid next states |
|------|------------------|
| `creating` | `starting`, `failed` |
| `starting` | `running`, `failed` |
| `running` | `idle`, `stopping`, `failed` |
| `idle` | `running`, `stopping`, `failed` |
| `stopping` | `stopped`, `failed` |
| `stopped` | *(terminal)* |
| `failed` | *(terminal)* |

### Pipeline run status transitions (`PIPELINE_RUN_TRANSITIONS`)

| From | Valid next states |
|------|------------------|
| `queued` | `preparing`, `cancelled` |
| `preparing` | `running`, `cancelled`, `failed` |
| `running` | `succeeded`, `failed`, `cancelled` |
| `succeeded` | *(terminal)* |
| `failed` | *(terminal)* |
| `cancelled` | *(terminal)* |

### Lease state transitions

`pending → active → released | expired | orphaned`

### Preview route state transitions

`pending → active → expired | revoked`

---

## API DTOs (`packages/contracts/src/api.ts`)

**Auth:**
- `ExchangeTokenRequest` — `{ code: string }`
- `ExchangeTokenResponse` — `{ token: string, user: User }`

**Workspace:**
- `CreateWorkspaceRequest` — `{ name, slug? }`
- `InviteMemberRequest` — `{ email, role: MembershipRole }`

**Project:**
- `CreateProjectRequest` — `{ name, description? }`

**Session:**
- `CreateSessionRequest` — `{ projectId }`
- `CreateSessionResponse` — session entity including `worker_host`, `host_port`

**Preview:**
- `CreatePreviewRouteRequest` — `{ sessionId, ttlSeconds? }`
- `CreatePreviewRouteResponse` — `{ previewId, previewUrl, expiresAt }`

**AI providers / pipelines:**
- `CreateProviderConfigRequest` — `{ name, providerType, credential, modelCatalogMode }`
- `CreatePipelineRunRequest` — `{ pipelineId, inputs, idempotencyKey }`
- `CreatePipelineRunResponse` — `{ runId, status: 'queued' }`

**Envelope types:**
- `ApiError` — `{ code: string, message: string, correlationId: string }`
- `ApiResponse<T>` — `{ data: T, correlationId: string }`
- `PaginatedResponse<T>` — `{ data: T[], nextCursor?: string, totalCount?: number }`

---

## Event Topics (`packages/contracts/src/events.ts`)

| Topic | Publisher | Key Consumers |
|-------|-----------|---------------|
| `SESSION_CREATED` | orchestrator | session-reaper, usage-meter |
| `SESSION_RESUMED` | orchestrator | usage-meter |
| `SESSION_IDLE_DETECTED` | session-reaper | orchestrator |
| `SESSION_STATE_CHANGED` | orchestrator | collaboration, usage-meter |
| `SESSION_TERMINATED` | orchestrator | collaboration, usage-meter |
| `PREVIEW_ROUTE_BOUND` | orchestrator | (gateway future cache invalidation) |
| `PREVIEW_ROUTE_REVOKED` | orchestrator | (gateway future cache invalidation) |
| `WORKER_REGISTERED` | worker-manager | orchestrator |
| `WORKER_UNHEALTHY` | worker-manager | orchestrator, monitoring |
| `SANDBOX_CAPACITY_LOW` | worker-manager | monitoring/alerting |
| `ARTIFACT_CREATED` | orchestrator | usage-meter |
| `USAGE_METER_RECORDED` | usage-meter | billing adapter |
| `PROVIDER_CONFIG_CREATED` | ai-orchestration | audit |
| `PROVIDER_CONFIG_UPDATED` | ai-orchestration | audit |
| `PROVIDER_CONFIG_SECRET_ROTATED` | ai-orchestration | audit |
| `PROVIDER_CONFIG_DELETED` | ai-orchestration | audit |
| `AGENT_ROLE_CREATED` | ai-orchestration | audit |
| `AGENT_ROLE_UPDATED` | ai-orchestration | audit |
| `PIPELINE_CREATED` | ai-orchestration | audit |
| `PIPELINE_UPDATED` | ai-orchestration | audit |
| `PIPELINE_RUN_CREATED` | ai-orchestration | usage-meter |
| `PIPELINE_RUN_STATUS_CHANGED` | ai-orchestration | usage-meter, api (polling) |

---

## Adapter Boundaries (`packages/adapters/src/`)

| Boundary | Interface | Implementations | Status |
|----------|-----------|-----------------|--------|
| Model invocation | `ModelProviderAdapter` | `AnthropicAdapter`, `OpenAIAdapter`, `GoogleAdapter`, `OpenAICompatibleAdapter`, `SelfHostedAdapter` | Implemented |
| Secret storage | `SecretManagerProvider` | `AWSSecretManagerProvider` (prod), `InMemorySecretManagerProvider` (dev/test) | Implemented |
| Auth provider | `AuthProvider` | `WorkOSAuthProvider` | Implemented |
| Git provider | `GitProvider` | GitHub, GitLab, Bitbucket | Implemented |
| Object storage | `StorageProvider` | S3 adapter, local filesystem adapter | Implemented |
| Queue | `QueueProvider` | `SqsEventPublisher`, Redis adapter | Implemented |
| Billing | `BillingProvider` | Adapter boundary exists | **Stubbed** — integration not connected |
| Notifications | `NotificationProvider` | Adapter boundary exists | **Stubbed** — integration not connected |

All model invocations go through `ModelProviderAdapterRegistry.get(providerType)` in `packages/adapters/src/model-provider/registry.ts`. The registry is the only place that maps `ProviderType` enum values to adapter instances.

---

## Inter-Service HTTP Calls

Services call each other via base URLs from env vars (see `docs/ENV_CONTRACT.md`). There is no service mesh — calls are plain HTTP internally.

| Caller | Callee | What for |
|--------|--------|---------|
| `api` | `orchestrator` | Session and preview route create/read/update |
| `api` | `ai-orchestration` | Transparent proxy for all AI endpoints (providers, roles, pipelines, runs) |
| `orchestrator` | `worker-manager` | Sandbox lease allocation |
| `gateway` | `database` (directly) | Preview route lookup — **not via orchestrator**, performance-critical |
| `session-reaper` | `orchestrator` | Drive session stop transitions |
| `host-agent` | `worker-manager` | Registration and heartbeat |

Note: `gateway` bypasses `orchestrator` for preview route lookups and reads `preview_routes` via `PgPreviewRouteRegistry` directly. This is intentional — the orchestrator would add unnecessary latency on the hot preview path.

---

## iOS Companion API Surface

The companion app (`apps/mobile-ios`) expects these endpoints to be stable on `apps/api`. Breaking changes require a client update.

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/v1/me` | Current user profile |
| `GET` | `/v1/workspaces` | List user's workspaces |
| `GET` | `/v1/workspaces/:id` | Workspace detail |
| `GET` | `/v1/workspaces/:id/members` | Workspace members |
| `GET` | `/v1/workspaces/:id/projects` | Projects in workspace |
| `POST` | `/v1/workspaces/:id/projects` | Create project |
| `GET` | `/v1/projects/:id` | Project detail |
| `GET` | `/v1/projects/:id/sessions` | Sessions for project |
| `POST` | `/v1/sessions` | Create session |
| `POST` | `/v1/sessions/:id/start` | Start session |
| `POST` | `/v1/sessions/:id/stop` | Stop session |
| `GET` | `/v1/projects/:id/comments` | Comment threads |
| `POST` | `/v1/projects/:id/comments` | Post comment |
| `GET` | `/v1/projects/:id/previews` | Preview routes |
| `POST` | `/auth/session/exchange` | WorkOS code → JWT |

---

## Pagination

All list endpoints use keyset pagination:
- Request: `?cursor={base64url_encoded_cursor}&limit={n}`
- Response: `PaginatedResponse<T>` with `nextCursor` for the next page
- Cursors encode `(timestamp, id)` pairs for stable, DESC-ordered iteration

Implementation: `packages/database/src/repositories/pg/cursor.ts`
