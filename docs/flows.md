# Key Request and State Flows

## 1. Authentication Flow

```
Browser / Mobile
  → WorkOS AuthKit login page
  → WorkOS returns authorization code to redirect URI

Client
  → POST /auth/session/exchange  { code: "..." }
  → apps/api/src/routes/auth.ts
      → WorkOSAuthProvider.authenticateWithCode(code)
          → WorkOS API: exchange code for WorkOS user token
          → Upsert user row in `users` table (create or update email/displayName)
      → Sign JWT:
          payload: { sub, email, displayName, workspaceId?, workspaceRole?, grantedPermissions[] }
          secret: JWT_SECRET
          ttl: JWT_EXPIRES_IN_SECONDS (default 86400)
  ← { token: "eyJ...", user: { id, email, displayName } }
```

All subsequent requests: `Authorization: Bearer {token}`

The JWT `workspaceId` and `grantedPermissions` are resolved once at token issuance. If workspace membership changes, the user must re-authenticate to get a new token with updated claims.

## 2. Session Creation Flow

```
Client
  → POST /v1/sessions  { projectId }
  → apps/api/src/routes/sessions.ts
      → Auth middleware: validate JWT, extract { sub, workspaceId, grantedPermissions }
      → Policy check: user has session.create permission in workspace
      → Load project; verify project.workspace_id === jwt.workspaceId
      → POST apps/orchestrator/v1/sessions  { projectId, workspaceId, userId }

apps/orchestrator/src/services/session.ts (PgSessionService)
  → PgSessionRepository.create({ projectId, workspaceId, userId })
      → INSERT session with state = 'creating', version = 1
  → POST apps/worker-manager/v1/leases  { sessionId, workspaceId }

apps/worker-manager
  → PgWorkerCapacityRepository.findAllHealthy()   (last_heartbeat_at > NOW() - 60s)
  → Select host; allocate port from available range 32000–33000
  → PgSandboxLeaseRepository.create({ sessionId, workerHost, hostPort, state: 'pending' })
  ← { worker_host, host_port }

apps/orchestrator (continued)
  → PgSessionRepository.update({ worker_host, host_port, state: 'starting', version: 2 })
  → Emit SESSION_CREATED event
  ← session entity

Client receives: { id, state: 'starting', worker_host, host_port, ... }
```

**Polling:** Web app polls `GET /v1/sessions/{id}` every 5 seconds until `state = 'running'`.

## 3. Preview Access Flow

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
          route.state === 'active'             else → 410 PREVIEW_REVOKED/EXPIRED
          route.expires_at > NOW()             else → 410 PREVIEW_EXPIRED
          route.workspace_id === jwt.workspaceId  else → 403 PREVIEW_FORBIDDEN
      → Strip hop-by-hop headers
      → http-proxy-middleware → http://{worker_host}:{host_port}/some/path

Worker sandbox (running user code)
  → processes request, returns response

Browser ← proxied response
```

The preview URL (`/preview/{previewId}/`) is stable for the lifetime of the route. The route ID does not expose the worker host or port — those come from the DB lookup.

## 4. Pipeline Run Flow

```
Client
  → POST /v1/workspaces/{wid}/ai/runs
    { pipelineId, inputs: {...}, idempotencyKey: "client-uuid" }

  → apps/api/src/routes/index.ts
      → Auth middleware + workspace membership check
      → Proxy request to apps/ai-orchestration

  → apps/ai-orchestration/src/routes/runs.ts
      → Check idempotency key: if run with same key exists, return existing
      → PgPipelineRunRepository.create({ pipelineId, workspaceId, inputs, idempotencyKey })
          → INSERT pipeline_runs with status = 'queued'
      ← { runId, status: 'queued' }   (response returned immediately — async execution)

  [async inside ai-orchestration]
      → dag-validator.ts: validateDag(pipelineDefinition)
          → Kahn's topological sort — reject if cycle detected
          → Verify all agent roles exist and belong to workspaceId
      → Transition run: queued → preparing → running
      → For each step (topological order):
          → Fetch provider_configs row for the agent role's provider
          → secretManager.get(providerConfig.credentialSecretRef) → plaintext credential
          → ModelProviderAdapterRegistry.get(providerType) → adapter instance
          → adapter.invoke({ messages, model, ... }) with credential
          → INSERT model_invocation_logs row (no credential in log)
          → Credential goes out of scope
      → On all steps complete: status → 'succeeded'
      → On any step error: status → 'failed', error_summary set
      → Emit PIPELINE_RUN_STATUS_CHANGED event

Client polls GET /v1/workspaces/{wid}/ai/runs/{runId} (every 10s via SWR hook)
```

## 5. Worker Registration and Heartbeat Flow

```
Worker host startup (host-agent)
  → POST /v1/workers/register
    { host: "worker-host-a.internal", portRange: [32000, 33000], capacity: 10 }
  → apps/worker-manager
      → INSERT/UPSERT worker_capacity row
      → Emit WORKER_REGISTERED event
  ← 200 OK

Loop every WORKER_HEARTBEAT_INTERVAL_MS (default 30s):
  → POST /v1/workers/worker-host-a.internal/heartbeat
    { capacity: 8 }    (remaining available sandbox slots)
  → apps/worker-manager
      → UPDATE worker_capacity SET last_heartbeat_at = NOW(), available_capacity = 8

Worker host shutdown:
  → heartbeat loop stops
  → worker-manager detects missed heartbeat at next allocation attempt
  → After 60s of no heartbeat: excluded from lease allocation
  → Emit WORKER_UNHEALTHY event → operator alert
```

## 6. Idle Session Cleanup Flow

```
session-reaper (every IDLE_SESSION_SCAN_INTERVAL_MS, default 60s):

  [Idle session scan]
  → PgSessionRepository.findIdleBeyond(idleThreshold)
  → For each idle session:
      → POST /v1/sessions/{id}/stop to orchestrator
          → Orchestrator transitions: running/idle → stopping → stopped
      → PgPreviewRouteRepository.revokeAllForSession(sessionId)
          → UPDATE preview_routes SET state = 'revoked', revoked_at = NOW()
             WHERE session_id = $1 AND state = 'active'
      → PgSandboxLeaseRepository.release(leaseId)
          → UPDATE sandbox_leases SET lease_state = 'released'
      → Emit SESSION_TERMINATED event
      → Collaboration service pushes session_terminated to connected WebSocket clients

  [Orphan lease scan]
  → PgSandboxLeaseRepository.findOrphanedLeases()
      → Leases in active/pending state where session is stopped/failed
  → Mark as 'orphaned'
  → Emit alert for operator investigation
```
