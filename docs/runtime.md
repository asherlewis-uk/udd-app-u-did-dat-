# Runtime Model

Implementation status labels are explicit throughout this document. Do not treat "planned" or "stubbed" behavior as currently operational.

---

## Session Lifecycle

**Status: Implemented**

```
creating ──► starting ──► running ⇄ idle ──► stopping ──► stopped
    │             │           │
    └──► failed ◄─┴───────────┘
```

Valid transitions are defined in `packages/contracts/src/enums.ts` as `SESSION_TRANSITIONS`. Any transition not in that table is rejected by the orchestrator.

| State | Meaning |
|-------|---------|
| `creating` | Orchestrator accepted the request; session row written |
| `starting` | Sandbox lease allocated; sandbox VM initialization expected (not yet verified — see worker section) |
| `running` | Session active; user code can execute; preview ports accessible |
| `idle` | No activity for configured idle threshold; session preserved, capacity still consumed |
| `stopping` | Teardown in progress — checkpoint if requested, then lease release |
| `stopped` | Terminal; lease released; all preview routes revoked |
| `failed` | Unrecoverable error; lease may require manual cleanup |

**Transition authority:**
- `api` → `orchestrator`: initiates create and stop
- `orchestrator` (`PgSessionService`): drives `creating → starting → running`
- `session-reaper`: drives `running/idle → idle/stopping`
- `host-agent` health reports: intended to inform failed transitions (mechanism not yet implemented — see below)

**Optimistic concurrency:** Session rows carry a `version` column. All state updates include `WHERE version = $current` and increment version. Concurrent updates throw `OptimisticConcurrencyError` — caller must retry.

---

## Sandbox Lease Allocation

**Status: Implemented — orchestrator queries DB directly**

Lease allocation does **not** go through an HTTP call to the worker-manager service. The orchestrator runs the entire selection and creation inside a single serializable DB transaction:

1. Lock the session row
2. Call `PgWorkerCapacityRepository.findHealthyWithLock()` — selects a healthy worker row with `FOR UPDATE SKIP LOCKED`. "Healthy" means `last_heartbeat_at > NOW() - 60s`.
3. Pick an available port from `worker_capacity.available_ports`
4. Write a `sandbox_leases` row: `{ session_id, worker_host, host_port, lease_state: 'active', expires_at }`
5. Update session with `worker_host`, `host_port`, `state: 'starting'`, `version: 2`
6. COMMIT. Then publish `SESSION_CREATED` event (after-commit, at-least-once delivery).

**If no healthy worker exists:** Transaction aborts, session transitions to `failed`.

**Concurrency safety:** The partial unique index on `sandbox_leases(worker_host, host_port)` WHERE non-terminal prevents two concurrent transactions from allocating the same port.

**Lease states:** `pending → active → released | expired | orphaned`

A lease becomes `orphaned` if the worker host dies before the lease is cleanly released. Session-reaper detects these.

---

## Worker-Manager Service

**Status: Implemented — capacity ingestion only**

The worker-manager service (`apps/worker-manager`) has a single endpoint:

```
POST /internal/capacity-snapshot
```

It receives a `WorkerCapacitySnapshot` payload from host agents and writes it to the `worker_capacity` table via `PgWorkerCapacityRepository.upsertSnapshot()`. It does not allocate leases, does not hold state in memory, and does not expose any lease or session management endpoints.

The comment in `app.ts`: `"internal, no auth — mTLS in prod"`. mTLS is not yet enforced.

---

## Host Agent

**Registration and heartbeat: Implemented**  
**Capacity measurement: Stubbed**

On startup:
1. `registerHost()` calls `collectCapacitySnapshot()` → POSTs to `{WORKER_MANAGER_URL}/internal/capacity-snapshot`

Every `WORKER_HEARTBEAT_INTERVAL_MS` (default 30s):
1. `publishHeartbeat()` calls `collectCapacitySnapshot()` → POSTs to the same endpoint

**`collectCapacitySnapshot()` is a stub.** Current code:
```typescript
// Phase 2: query the host OS / container runtime for actual state
return {
  workerHost: WORKER_HOST,
  totalSlots: 10,
  usedSlots: 0,
  availablePorts: Array.from({ length: 10 }, (_, i) => 32100 + i),
  healthy: true,
};
```

This means every worker host always reports 10 available slots and ports 32100–32109, regardless of actual sandbox usage. The orchestrator allocates from these reported ports without verification from the host OS.

**MicroVM provisioning: Not implemented.** The host agent registers and heartbeats. It does not spin up Firecracker VMs or any equivalent sandbox environment. The `starting` → `running` session transition occurs in the orchestrator based on the DB allocation, not on a confirmed VM boot signal from the host agent.

**Unhealthy detection:** Worker rows with `last_heartbeat_at` older than 60 seconds are excluded from allocation. There is no active `WORKER_UNHEALTHY` event emission implemented in the current host-agent code — the threshold is only checked at allocation time by the orchestrator.

---

## Preview Gateway Runtime

**Status: Implemented**

On every request to `/preview/{previewId}/{path...}`:

1. **Auth middleware** validates JWT; extracts `workspaceId` from claims
2. **Route registry** (`PgPreviewRouteRegistry`) performs a DB read — no cache
3. **Checks** (all must pass):
   - `route.state === 'active'`
   - `route.expires_at > NOW()`
   - `route.workspace_id === jwt.workspaceId`
   - Worker target passes subnet/loopback/metadata IP filtering
4. **Strips** hop-by-hop headers
5. **Proxies** via `http-proxy-middleware` to `binding.worker_host:binding.host_port`

**No caching of route bindings.** See ADR 002 and constraint C10.

| Condition | HTTP | Error code |
|-----------|------|-----------|
| Route not found | 404 | `PREVIEW_NOT_FOUND` |
| Route expired | 410 | `PREVIEW_EXPIRED` |
| Route revoked | 410 | `PREVIEW_REVOKED` |
| Workspace mismatch | 403 | `PREVIEW_FORBIDDEN` |
| Upstream unreachable | 502 | — |

---

## Pipeline Execution Runtime

**Status: Implemented (async)**

Pipeline runs are **asynchronous** — the API returns `{ runId, status: 'queued' }` immediately.

**Execution sequence** inside `ai-orchestration`:
1. Check idempotency key — return existing run if duplicate
2. Create `pipeline_runs` row, status = `queued`
3. Validate pipeline DAG (Kahn's algorithm in `dag-validator.ts`) — must be acyclic; all agent roles must exist and belong to the same workspace
4. Transition: `queued → preparing → running`
5. For each step in topological order:
   - Fetch `credentialSecretRef` from `provider_configs`
   - `GCPSecretManagerProvider.get(ref)` → plaintext credential (production); `InMemorySecretManagerProvider` (dev/test)
   - `resolveAdapterForConfig(providerConfig)` → adapter instance
   - `adapter.invoke(request)` — credential passed, not logged
   - INSERT `model_invocation_logs` row (no credential stored)
   - Credential goes out of scope after the call
6. On completion: status → `succeeded` or `failed`; emit `PIPELINE_RUN_STATUS_CHANGED`

**Stuck run recovery:** Scheduled job in `ai-orchestration` marks runs in `preparing`/`running` state beyond `STUCK_RUN_TIMEOUT_MS` (default 5 minutes) as `failed`.

---

## Session Reaper

**Status: Implemented — runs as Cloud Run Job**

In production, the session-reaper is deployed as a Cloud Run Job triggered by Cloud Scheduler every 5 minutes. The code contains a `setInterval` loop (`SCAN_INTERVAL_MS`, default 60s) suited for long-running process mode; in Cloud Run Job mode, one cycle runs and the process exits.

Each cycle:
1. `reapIdleSessions()` — finds sessions in `running`/`idle` state beyond the idle threshold, transitions them to `stopped`, revokes preview routes, releases leases
2. `reapOrphanedLeases()` — finds leases where the session is terminal but the lease is still active/pending; marks as `orphaned`

Per-session errors are caught and logged without blocking other sessions.
