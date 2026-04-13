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

Note: `WORKER_REGISTERED` and `WORKER_UNHEALTHY` are defined as event topics, but the current worker-manager implementation only calls `upsertSnapshot()`. Emission of these specific events has not been verified in the worker-manager source.

---

## Adapter Boundaries (`packages/adapters/src/`)

| Boundary | Interface | Production implementation | Dev/test implementation | Status |
|----------|-----------|--------------------------|------------------------|--------|
| Model invocation | `ModelProviderAdapter` | `AnthropicAdapter`, `OpenAIAdapter`, `GoogleAdapter`, `OpenAICompatibleAdapter`, `SelfHostedAdapter` | Same | Implemented |
| Secret storage | `SecretManagerProvider` | `GCPSecretManagerProvider` | `InMemorySecretManagerProvider` | Implemented |
| Auth provider | `AuthProvider` | `WorkOSAuthProvider` | — | Implemented |
| Git provider | `GitProvider` | GitHub, GitLab, Bitbucket adapters | — | Implemented |
| Object storage | `StorageProvider` | S3 adapter (via `OBJECT_STORAGE_PROVIDER=aws`) | Local filesystem | Implemented |
| Queue | `QueueProvider` | `SqsEventPublisher` (via `QUEUE_PROVIDER=sqs`) | Noop/Redis | Implemented |
| Billing | `BillingProvider` | `StripeBillingProvider` | — | **Stubbed** — all methods throw `NotImplementedError` |
| Notifications | `NotificationProvider` | `EmailNotificationProvider` | — | **Stubbed** — `send()` throws `NotImplementedError` |

**Secret manager selection (from `apps/ai-orchestration/src/context.ts`):**
```typescript
process.env['NODE_ENV'] === 'production'
  ? new GCPSecretManagerProvider()
  : new InMemorySecretManagerProvider()
```
This is not governed by a `SECRET_MANAGER_PROVIDER` env var. It is hardcoded by `NODE_ENV`.

**Model provider registry:** `ModelProviderAdapterRegistry.get(providerType)` in `packages/adapters/src/model-provider/registry.ts` is the sole mapping from `ProviderType` enum values to adapter instances.

---

## Inter-Service HTTP Calls

| Caller | Callee | Endpoint | Purpose |
|--------|--------|----------|---------|
| `api` | `orchestrator` | various `/v1/sessions`, `/v1/previews` | Session and preview route CRUD |
| `api` | `ai-orchestration` | transparent proxy | All AI endpoints (providers, roles, pipelines, runs) |
| `gateway` | `database` (directly) | — | Preview route lookup via `PgPreviewRouteRegistry` |
| `session-reaper` | `orchestrator` | session stop endpoints | Drive session stop transitions |
| `host-agent` | `worker-manager` | `POST /internal/capacity-snapshot` | Registration and periodic heartbeats |

**Important:** The orchestrator does NOT call worker-manager via HTTP for lease allocation. It queries `worker_capacity` directly via `PgWorkerCapacityRepository.findHealthyWithLock()` and creates leases in the same DB transaction. See `docs/runtime.md`.

---

## Worker-Manager API

Single endpoint (internal, no auth — mTLS planned but not yet enforced):

```
POST /internal/capacity-snapshot
Content-Type: application/json

{
  "workerHost": "string",
  "totalSlots": number,
  "usedSlots": number,
  "availablePorts": number[],
  "healthy": boolean
}

→ 204 No Content
→ 400 { code: "VALIDATION_ERROR", message: "..." }
→ 500 { code: "INTERNAL_ERROR", message: "..." }
```

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

## Android Companion API Surface

The Android app (`apps/mobile-android`) implements:
- `GET /v1/me` — current user
- `GET /v1/workspaces` — workspace list

Its in-code scope comment states: "Status/review/comments companion — NO code editor, NO terminal." The full API surface it will need is not yet defined; the iOS surface above is the closest reference.

---

## Pagination

All list endpoints use keyset pagination:
- Request: `?cursor={base64url_encoded_cursor}&limit={n}`
- Response: `PaginatedResponse<T>` with `nextCursor` for the next page
- Cursors encode `(timestamp, id)` pairs for stable, DESC-ordered iteration

Implementation: `packages/database/src/repositories/pg/cursor.ts`
