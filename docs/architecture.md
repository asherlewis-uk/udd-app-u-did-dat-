# Architecture

## Service Map

| Service | Port | Plane | Primary Role |
|---------|------|-------|-------------|
| `apps/api` | 3001 | Control (public) | REST API gateway / BFF — all web and mobile client traffic |
| `apps/gateway` | 3000 | Control (public) | Preview proxy — routes `/preview/{id}/*` to worker sandbox ports |
| `apps/orchestrator` | 3002 | Control (internal) | Session and preview route lifecycle; allocates sandbox leases from DB directly |
| `apps/collaboration` | 3003 | Control (internal) | WebSocket server — real-time presence, comments |
| `apps/ai-orchestration` | 3004 | Control (internal) | Provider configs, agent roles, pipeline definitions, run execution |
| `apps/worker-manager` | 3005 | Control (internal) | Capacity snapshot ingestion from host agents (`POST /internal/capacity-snapshot`) |
| `apps/host-agent` | — | Worker | Runs on each worker VM — registration and heartbeat via capacity snapshots |
| `apps/session-reaper` | — | Background | Scans for idle sessions and orphaned leases; drives cleanup |
| `apps/usage-meter` | — | Background | Consumes usage events; records to DB; uploads to billing adapter |
| `apps/web` | 3006 | Public | Next.js 14 (App Router) web front-end |
| `apps/mobile-ios` | — | Client | Swift/SwiftUI companion — auth, workspace/project/session views, preview |
| `apps/mobile-android` | — | Client | Kotlin/Jetpack Compose companion — tab UI + API client; scope-limited (partial) |

**Worker-manager clarification:** worker-manager does not allocate leases. It only ingests capacity snapshots from host agents and writes them to the `worker_capacity` table. Lease allocation is done by the orchestrator in a DB transaction — see `apps/orchestrator/src/services/session.ts`.

**Android companion clarification:** The Android app has a real Compose UI (`MainActivity.kt` with tab navigation) and a real Ktor HTTP client (`ApiClient.kt`). It is not a skeleton. Its declared scope (from an in-code comment) is "Status/review/comments companion — NO code editor, NO terminal."

## Shared Package Map

| Package | What it owns | Who imports it |
|---------|-------------|----------------|
| `@udd/contracts` | Entity types, DTOs, enums, state transition tables, event topic names | Every service and package |
| `@udd/database` | Schema migrations, repository interfaces, PG implementations | api, orchestrator, collaboration, ai-orchestration, worker-manager, session-reaper, usage-meter, gateway |
| `@udd/auth` | JWT middleware, RBAC role→permission map, policy helpers | api, orchestrator, collaboration, ai-orchestration, worker-manager |
| `@udd/config` | Typed env var accessors (`required`, `optional`, `flag`) | Every service |
| `@udd/adapters` | All vendor boundaries (model providers, secrets, auth, git, storage, queue, billing, notifications) | api, ai-orchestration |
| `@udd/events` | Event publisher/consumer interfaces, Noop implementation | Every service |
| `@udd/observability` | JSON logger, metrics facade, OpenTelemetry tracing, health endpoints | Every service |
| `@udd/testing` | Test factories, fixtures, assertion helpers | Test suites only |

**Dependency rule:** `packages/contracts` has no `@udd/*` dependencies — it is the base. Packages must not import from `apps/`. Provider SDKs must only be imported within `packages/adapters/src/model-provider/`.

## Control Plane vs Worker Plane

```
Internet
  │
  └── GCP Cloud Load Balancer
        │
        ├── apps/web       (3006)   Next.js SSR + static assets
        ├── apps/api       (3001)   REST API ─────────────────────────────┐
        └── apps/gateway   (3000)   Preview proxy ─────────────────────────┼──► worker-host:32100-32109
                                                                           │    (port range per host)
        ┌──────────────── internal VPC only ─────────────────────────────────┤
        │                                                                   │
        ├── apps/orchestrator     (3002)   ◄── PgWorkerCapacityRepository (DB)
        ├── apps/collaboration    (3003)
        ├── apps/ai-orchestration (3004)
        └── apps/worker-manager   (3005)   ◄── host-agent capacity snapshots

Worker plane (private subnet — no direct inbound internet):
  └── worker-host  (host-agent process + user sandboxes)
      → POSTs /internal/capacity-snapshot to worker-manager on startup and every heartbeat interval

Background jobs (Cloud Run Jobs, triggered by Cloud Scheduler):
  ├── apps/session-reaper  (Cloud Scheduler: every 5 minutes)
  └── apps/usage-meter
```

**The gateway is the only service that routes traffic to worker preview ports.** Sandbox breakout cannot reach control plane services. See ADR 001.

**Orchestrator accesses worker capacity directly via DB** (`PgWorkerCapacityRepository.findHealthyWithLock()` with `FOR UPDATE SKIP LOCKED`), not via HTTP to worker-manager. Lease creation and worker selection happen in a single serializable transaction.

## Database Ownership

All services share a single PostgreSQL 16 instance (Cloud SQL). Tenancy isolation is enforced by the application layer (not PG RLS). Every table row carries `workspace_id` where applicable.

| Tables | Service that writes | Services that read |
|--------|--------------------|--------------------|
| `users`, `organizations`, `workspaces`, `memberships`, `role_grants` | api | auth middleware (all services) |
| `projects`, `project_repos`, `project_environments` | api | orchestrator |
| `sessions` | orchestrator, session-reaper | api, gateway (indirect) |
| `sandbox_leases` | orchestrator (creates), session-reaper (releases) | — |
| `preview_routes` | orchestrator | gateway, api |
| `worker_capacity` | worker-manager | orchestrator |
| `provider_configs`, `agent_roles`, `pipeline_definitions` | ai-orchestration | api (read-proxy) |
| `pipeline_runs`, `model_invocation_logs` | ai-orchestration | api (read-proxy) |
| `comments` | collaboration | api |
| `audit_logs` | All services (append-only) | — |
| `usage_meter_events` | usage-meter | — |
| `secret_metadata` | ai-orchestration | — |

## Tenancy Model

**Three levels: Organization → Workspace → Project**

- `Organization` — billing entity, maps to a WorkOS organization
- `Workspace` — primary collaboration unit; users hold membership here
- `Project` — container for sessions, previews, pipeline runs, comments; belongs to one workspace

Every workspace-scoped DB row carries `workspace_id`. Every repository method filters by it. Cross-workspace access is not permitted at any layer. See ADR 003.

**RBAC hierarchy** (each role includes all permissions of roles below it):
```
org_owner
  └── workspace_admin
        └── workspace_member
              └── project_editor
                    └── project_viewer
```

Source of truth: `packages/auth/src/rbac.ts`

## Infrastructure

**Deployment:** GCP exclusively.
- Compute: Cloud Run (services), Cloud Run Jobs (session-reaper, worker-manager)
- Database: Cloud SQL PostgreSQL 16 (regional HA, 4 vCPU / 15.36 GB, with read replica)
- Cache: Memorystore Redis (STANDARD_HA, 4 GB)
- Images: Google Container Registry (GCR)
- State: GCS bucket for Terraform state
- Scheduling: Cloud Scheduler (triggers session-reaper every 5 minutes)

**Provider:** `infra/terraform/` uses the `hashicorp/google` provider exclusively. No AWS provider blocks exist in any Terraform file.

**Application-layer adapters** in `@udd/adapters` include AWS-compatible implementations (SqsEventPublisher, S3 storage). These are present but the production configuration deploys GCP services. The production secret manager is `GCPSecretManagerProvider`, selected by `NODE_ENV === 'production'` in `apps/ai-orchestration/src/context.ts`.

**CI/CD:** GitHub Actions. Build and test on every PR. Deploy to dev (main branch), staging/prod (release/* branches with manual gates). See `.github/workflows/`.
