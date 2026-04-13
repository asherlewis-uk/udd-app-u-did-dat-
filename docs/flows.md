# Key Request and State Flows

All flows below reflect implemented code, not intended design. Where a flow differs from the original architectural description (e.g., orchestrator uses DB-direct worker selection rather than an HTTP call to worker-manager), the implemented behavior is documented.

---

## 1. Authentication Flow

**Status: Implemented**

```
Browser / Mobile
  → WorkOS AuthKit login page
  → WorkOS returns authorization code to redirect URI

Client
  → POST /auth/session/exchange  { code: "..." }
  → apps/api/src/routes/auth.ts
      → WorkOSAuthProvider.authenticateWithCode(code)
          → WorkOS API: exchange code for WorkOS user token
          → Upsert user row in `users` table (create or update)
      → Sign JWT:
          payload: { sub, email, displayName, workspaceId?, workspaceRole?, grantedPermissions[] }
          secret: JWT_SECRET
          ttl: JWT_EXPIRES_IN_SECONDS (default 86400)
  ← { token: "eyJ...", user: { id, email, displayName } }
```

All subsequent requests: `Authorization: Bearer {token}`

JWT `workspaceId` and `grantedPermissions` are resolved at token issuance. Workspace membership changes require re-authentication.

---

## 2. Session Creation Flow

**Status: Implemented** — orchestrator allocates leases via DB transaction, not via HTTP to worker-manager

```
Client
  → POST /v1/sessions  { projectId }
  → apps/api/src/routes/sessions.ts
      → Auth middleware: validate JWT, extract { sub, workspaceId, grantedPermissions }
      → Policy check: user has session.create permission
      → Load project; verify project.workspace_id === jwt.workspaceId
      → POST apps/orchestrator/v1/sessions  { projectId, workspaceId, userId }

apps/orchestrator/src/services/session.ts (PgSessionService.startSession)
  → Begin serializable DB transaction:
      → SELECT session FOR UPDATE  (lock session row)
      → PgWorkerCapacityRepository.findHealthyWithLock()
          → SELECT * FROM worker_capacity
             WHERE healthy = true
               AND last_heartbeat_at > NOW() - INTERVAL '60 seconds'
             FOR UPDATE SKIP LOCKED
             LIMIT 1
      → Pick available port from worker_capacity.available_ports
      → PgSandboxLeaseRepository.create({
            sessionId, workerHost, hostPort,
            leaseState: 'active', expiresAt
          })
          → INSERT with partial unique index enforcement
      → PgSessionRepository.update({
            state: 'starting', workerHost, hostPort,
            version: current + 1
          })
  → COMMIT
  → (after commit) Emit SESSION_CREATED event

  ← session entity { id, state: 'starting', worker_host, host_port, ... }

NOTE: 'starting' → 'running' transition currently requires a manual client-side
assumption or a subsequent state update. The host agent does not signal VM boot
completion (VM provisioning is not implemented — see docs/runtime.md).
```

**Polling:** Web app polls `GET /v1/sessions/{id}` every 5 seconds via SWR hook.

---

## 3. Preview Access Flow

**Status: Implemented**

```
Browser
  → GET /preview/{previewId}/some/path
  → apps/gateway/src/index.ts
      → Auth middleware: validate JWT → extract workspaceId
      → PgPreviewRouteRegistry.resolve(previewId)
          → SELECT id, state, expires_at, workspace_id, worker_host, host_port
             FROM preview_routes
             WHERE preview_id = $1
          (no cache — DB read on every request)
      → Checks:
          route.state === 'active'               else → 410 PREVIEW_REVOKED/EXPIRED
          route.expires_at > NOW()               else → 410 PREVIEW_EXPIRED
          route.workspace_id === jwt.workspaceId else → 403 PREVIEW_FORBIDDEN
          worker target passes IP safety filter  else → 502
      → Strip hop-by-hop headers
      → http-proxy-middleware → http://{worker_host}:{host_port}/some/path

Worker sandbox
  → processes request, returns response

Browser ← proxied response
```

---

## 4. Pipeline Run Submission Flow

**Status: Implemented (async)**

```
Client
  → POST /v1/workspaces/{wid}/ai/runs
    { pipelineId, inputs: {...}, idempotencyKey: "client-uuid" }

  → apps/api  (transparent proxy to apps/ai-orchestration)

  → apps/ai-orchestration/src/routes/runs.ts
      → Check idempotency key: if run exists with same key, return it
      → PgPipelineRunRepository.create({ pipelineId, workspaceId, inputs, idempotencyKey })
          → INSERT pipeline_runs with status = 'queued'
      ← { runId, status: 'queued' }   (returned immediately — execution is async)

  [async, inside ai-orchestration]
      → dag-validator.ts: validateDag(pipelineDefinition, workspaceId)
          → Kahn's topological sort — reject if cycle detected
          → Verify all agent roles exist and belong to workspaceId
      → Transition: queued → preparing → running
      → For each step (topological order):
          → SELECT credentialSecretRef FROM provider_configs
          → GCPSecretManagerProvider.get(credentialSecretRef)  [prod]
             InMemorySecretManagerProvider.get(credentialSecretRef)  [dev/test]
          → resolveAdapterForConfig(providerConfig) → adapter instance
          → adapter.invoke({ messages, model, ... })
          → INSERT model_invocation_logs (no credential)
          → Credential out of scope
      → On all steps: status → 'succeeded'
      → On any error: status → 'failed', error_summary set
      → Emit PIPELINE_RUN_STATUS_CHANGED

Client polls GET /v1/workspaces/{wid}/ai/runs/{runId} (every 10s via SWR hook)
```

---

## 5. Host Agent → Worker-Manager Capacity Flow

**Status: Registration and heartbeat implemented; capacity values are stubbed**

```
Worker host startup (host-agent)

  registerHost():
  → collectCapacitySnapshot()
    → returns hardcoded { totalSlots: 10, usedSlots: 0,
                          availablePorts: [32100..32109], healthy: true }
    (Phase 2 stub — does not query actual OS/container runtime)
  → POST {WORKER_MANAGER_URL}/internal/capacity-snapshot
    { workerHost, totalSlots, usedSlots, availablePorts, healthy, reportedAt }
  → apps/worker-manager: validate payload, upsertSnapshot to DB
  ← 204 No Content

  Loop every WORKER_HEARTBEAT_INTERVAL_MS (default 30s):
  → publishHeartbeat()
    → collectCapacitySnapshot()  (same hardcoded stub)
    → POST /internal/capacity-snapshot
    → apps/worker-manager: upsertSnapshot (UPDATE last_heartbeat_at)
  ← 204 No Content

  Worker host shutdown:
  → heartbeat loop stops
  → orchestrator excludes host when last_heartbeat_at > 60s old (at next allocation)
```

**There is no `WORKER_UNHEALTHY` event emitted by the current host-agent.** Stale heartbeat detection happens passively at allocation time when the orchestrator's `findHealthyWithLock()` query finds no healthy workers.

---

## 6. Idle Session Cleanup Flow

**Status: Implemented — runs as Cloud Run Job (Cloud Scheduler every 5 minutes)**

```
session-reaper (triggered by Cloud Scheduler every 5 min):

  reapIdleSessions():
  → PgSessionRepository.findIdleBeyond(threshold)
  → For each idle session:
      → Re-check inside UPDATE (atomic — prevents race with concurrent stop)
      → Transition: running/idle → stopping → stopped
      → PgPreviewRouteRepository.revokeAllForSession(sessionId)
          → UPDATE preview_routes SET state = 'revoked' WHERE session_id = $1
      → PgSandboxLeaseRepository.release(leaseId)
          → UPDATE sandbox_leases SET lease_state = 'released'
      → Emit SESSION_STATE_CHANGED event
      → (per-session errors caught; other sessions continue)

  reapOrphanedLeases():
  → Find leases in active/pending state where session is stopped/failed
  → Mark lease_state = 'orphaned'
  → Log for operator investigation

  Process exits after both complete.
```
