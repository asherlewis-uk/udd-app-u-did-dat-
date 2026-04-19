# Connectivity Audit Report

**Date:** 2026-04-19
**Scope:** Inter-service `/healthz` connectivity across the UDD control plane

---

## 1. Connectivity Endpoint

**`GET /v1/healthz/connectivity`** — `apps/api/src/routes/healthz.ts`

Probes the following services via `HEAD <baseUrl>/healthz` with a 5 s timeout:

| Service Key      | Config Accessor                          | Env Variable                 | Local Default            |
| ---------------- | ---------------------------------------- | ---------------------------- | ------------------------ |
| orchestrator     | `config.services.orchestratorBaseUrl()`  | `ORCHESTRATOR_BASE_URL`      | `http://localhost:3002`  |
| collaboration    | `config.services.collaborationBaseUrl()` | `COLLABORATION_BASE_URL`     | `http://localhost:3003`  |
| aiOrchestration  | `config.services.aiOrchestrationBaseUrl()` | `AI_ORCHESTRATION_BASE_URL` | `http://localhost:8080` |
| workerManager    | `config.services.workerManagerBaseUrl()` | `WORKER_MANAGER_BASE_URL`    | `http://localhost:3005`  |
| usageMeter       | `config.services.usageMeterBaseUrl()`    | `USAGE_METER_BASE_URL`       | `http://localhost:3006`  |
| gateway          | `config.services.gatewayBaseUrl()`       | `GATEWAY_BASE_URL`           | `http://localhost:3000`  |

**Verdict:** ✅ All six required services are probed. Response returns `200` when all pass, `207` on partial failure, with per-probe latency and status.

---

## 2. `/healthz` Endpoint Coverage

All services use `mountHealthRoutes()` from `@udd/observability` which now mounts:

- `GET /health` — full health report (all registered checks)
- `GET /ready` — readiness probe (503 if unhealthy)
- `GET /alive` — liveness probe (always 200)
- `GET /healthz` — lightweight probe (always 200, JSON `{ status: "ok" }`)

| Service             | Uses `mountHealthRoutes`? | `/healthz` Available? |
| ------------------- | ------------------------- | --------------------- |
| api                 | ✅                        | ✅                    |
| gateway             | ✅                        | ✅                    |
| orchestrator        | ✅                        | ✅                    |
| collaboration       | ✅                        | ✅                    |
| ai-orchestration    | ✅                        | ✅                    |
| worker-manager      | ✅                        | ✅                    |
| usage-meter         | ✅                        | ✅                    |

**Verdict:** ✅ All seven HTTP services mount `/healthz`.

---

## 3. Terraform Env Block Audit

**File:** `infra/terraform/modules/compute/main.tf`

The API service's `containers.env` block injects peer-service URLs using `google_cloud_run_v2_service.<name>.uri`:

| Env Variable                 | Terraform Resource Reference                        | Correct? |
| ---------------------------- | --------------------------------------------------- | -------- |
| `AI_ORCHESTRATION_BASE_URL`  | `google_cloud_run_v2_service.ai_orchestration.uri`  | ✅       |
| `ORCHESTRATOR_BASE_URL`      | `google_cloud_run_v2_service.orchestrator.uri`      | ✅       |
| `COLLABORATION_BASE_URL`     | `google_cloud_run_v2_service.collaboration.uri`     | ✅       |
| `WORKER_MANAGER_BASE_URL`    | `google_cloud_run_v2_service.worker_manager.uri`    | ✅       |
| `USAGE_METER_BASE_URL`       | `google_cloud_run_v2_service.usage_meter.uri`       | ✅       |
| `GATEWAY_BASE_URL`           | `google_cloud_run_v2_service.gateway.uri`           | ✅       |

**Verdict:** ✅ All six env vars reference the correct `.uri` attribute of their respective `google_cloud_run_v2_service` resource.

---

## 4. Typecheck

```
pnpm typecheck → turbo run typecheck
Tasks: 31 successful, 31 total
Cached: 5 cached, 31 total
Time: ~15s
```

**Verdict:** ✅ Zero type errors across all 21 packages.

---

## 5. Issues Found and Fixed

| # | Issue | File(s) | Fix |
|---|-------|---------|-----|
| 1 | `/healthz` not mounted — connectivity probe expected it but services only exposed `/health`, `/ready`, `/alive` | `packages/observability/src/health.ts` | Added `GET /healthz` returning `200 { status: "ok" }` to `mountHealthRoutes()` |
| 2 | `aiOrchestrationBaseUrl` default port was `3004` but the service listens on `8080` | `packages/config/src/index.ts` | Changed default from `http://localhost:3004` to `http://localhost:8080` |
| 3 | `GATEWAY_BASE_URL` missing from API service Terraform env block — probe targets gateway but the URL was never injected | `infra/terraform/modules/compute/main.tf` | Added `GATEWAY_BASE_URL = google_cloud_run_v2_service.gateway.uri` env entry |

---

## 6. Summary

| Check                            | Status |
| -------------------------------- | ------ |
| Connectivity endpoint complete   | ✅     |
| All services expose `/healthz`   | ✅     |
| Terraform env vars correct       | ✅     |
| Monorepo typecheck passes        | ✅     |

**The control-plane connectivity mesh is fully wired and type-safe.**
