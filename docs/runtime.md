# Runtime Model

## Session Lifecycle

```
creating ──► starting ──► running ⇄ idle ──► stopping ──► stopped
    │             │           │
    └──► failed ◄─┴───────────┘
```

**Valid transitions** are defined in `packages/contracts/src/enums.ts` as `SESSION_TRANSITIONS`. Any transition not in that table must be rejected by the orchestrator.

| State | Meaning |
|-------|---------|
| `creating` | Orchestrator accepted the request; lease allocation in progress |
| `starting` | Lease allocated; sandbox VM being initialized on worker host |
| `running` | Session active; user code can execute; preview ports accessible |
| `idle` | No activity for configured idle threshold; session preserved, capacity still consumed |
| `stopping` | Teardown in progress — checkpoint if requested, then lease release |
| `stopped` | Terminal state; lease released; all preview routes revoked |
| `failed` | Unrecoverable error; lease may require manual cleanup (see runbook) |

**Transition authority:**
- `api` → `orchestrator`: initiates create and stop
- `orchestrator`: drives `creating → starting → running`
- `session-reaper`: drives `running/idle → idle/stopping`
- `host-agent` health reports: inform `orchestrator` to drive `→ failed`

**Optimistic concurrency:** Session rows carry a `version` column. All state updates must `WHERE version = $current` and increment it. Concurrent updates throw `OptimisticConcurrencyError` — caller must retry.

## Worker Allocation

When a session is created, the orchestrator allocates a sandbox lease:

1. Orchestrator calls `POST /v1/leases` on worker-manager with `{ sessionId, workspaceId }`
2. Worker-manager queries `worker_capacity` for hosts with `last_heartbeat_at > NOW() - 60s`
3. Selects a host with available port capacity; picks a port from range 32000–33000
4. Writes `sandbox_leases` row: `{ worker_host, host_port, session_id, lease_state: 'pending', expires_at }`
5. Returns `{ worker_host, host_port }` to orchestrator
6. Orchestrator writes `worker_host` and `host_port` onto the session row; transitions to `starting`

**If no capacity available:** Worker-manager returns an error. Orchestrator transitions session to `failed`. Client receives an appropriate error response.

**Lease states:** `pending → active → released | expired | orphaned`

A lease becomes `orphaned` if the worker host dies before the lease is cleanly released. The session-reaper detects these (see below).

## Preview Gateway Runtime

On every request to `/preview/{previewId}/{path...}`:

1. **Auth middleware** validates JWT; extracts `workspaceId` from claims
2. **Route registry** (`PgPreviewRouteRegistry`) performs a DB read: `SELECT ... FROM preview_routes WHERE preview_id = $1`
3. **Checks** (all must pass):
   - `route.state = 'active'`
   - `route.expires_at > NOW()`
   - `route.workspace_id = jwt.workspaceId`
4. **Strips** hop-by-hop headers (`connection`, `keep-alive`, `proxy-authenticate`, etc.)
5. **Proxies** via `http-proxy-middleware` to `binding.worker_host:binding.host_port`

**No caching of route bindings.** Every request reads from DB. A cached stale binding could route to a revoked or reallocated lease. See ADR 002.

**Failure responses:**
| Condition | HTTP | Error code |
|-----------|------|-----------|
| Route not found | 404 | `PREVIEW_NOT_FOUND` |
| Route expired | 410 | `PREVIEW_EXPIRED` |
| Route revoked | 410 | `PREVIEW_REVOKED` |
| Workspace mismatch | 403 | `PREVIEW_FORBIDDEN` |
| Upstream unreachable | 502 | — |

## Pipeline Execution Runtime

Pipeline runs are **asynchronous** — the API returns `{ runId, status: 'queued' }` immediately.

**Execution sequence** (inside `ai-orchestration`):
1. Validate idempotency key — return existing run if duplicate
2. Create `pipeline_runs` row in `queued` state
3. Validate pipeline DAG (Kahn's algorithm via `dag-validator.ts`) — must be a DAG, no cycles, all agent roles must exist and belong to the same workspace
4. Transition run to `preparing`, then `running`
5. For each step in topological order:
   a. Fetch `credentialSecretRef` from `provider_configs`
   b. Fetch actual credential from secret manager using the ref
   c. Instantiate correct adapter via `ModelProviderAdapterRegistry.get(providerType)`
   d. Call `adapter.invoke(request)` — credential passed, not logged
   e. Record invocation in `model_invocation_logs`
   f. Update run step status
6. On completion: transition to `succeeded` or `failed`
7. Emit `PIPELINE_RUN_STATUS_CHANGED` event

**Stuck run recovery:** A scheduled job inside `ai-orchestration` scans for runs in `preparing`/`running` state beyond `STUCK_RUN_TIMEOUT_MS` (default 5 minutes) and transitions them to `failed`. See runbook `stuck-pipeline-run.md`.

**Credential lifecycle:** Credential is fetched at invocation time, passed to the adapter method, not assigned to any persistent variable, and goes out of scope after the HTTP call completes.

## Host Agent Heartbeat Loop

On startup:
1. Host agent POSTs to `POST /v1/workers/register` on worker-manager with `{ host, portRange, capacity }`
2. Worker-manager inserts/upserts a `worker_capacity` row

Every `WORKER_HEARTBEAT_INTERVAL_MS` (default 30s):
1. Agent sends heartbeat to `POST /v1/workers/{host}/heartbeat` with current capacity report
2. Worker-manager updates `worker_capacity.last_heartbeat_at = NOW()`

**Unhealthy threshold:** Hosts with `last_heartbeat_at` older than 60 seconds are excluded from lease allocation. After 2× interval with no heartbeat, worker-manager marks the host unhealthy and emits `WORKER_UNHEALTHY`.

On shutdown: host agent stops heartbeat loop. Worker-manager detects missed heartbeat and marks unhealthy.

## Session Reaper Loop

Every `IDLE_SESSION_SCAN_INTERVAL_MS` (default 60s):

1. Query sessions in `running` or `idle` state with no activity beyond the idle threshold
2. For each: call orchestrator to transition `→ stopping → stopped`
3. Revoke all preview routes for the session (`PgPreviewRouteRepository.revokeAllForSession`)
4. Release the sandbox lease (`PgSandboxLeaseRepository.release`)
5. Emit `SESSION_TERMINATED` event

**Orphan lease scan** (same loop):
1. Query `sandbox_leases` where `lease_state IN ('active', 'pending')` and the associated session is in `stopped`/`failed` state
2. Mark as `orphaned`
3. Emit alert (for operator investigation)
