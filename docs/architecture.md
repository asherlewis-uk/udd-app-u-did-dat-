# Architecture

## Service Map

| Service | Port | Plane | Primary Role |
|---------|------|-------|-------------|
| `apps/api` | 3001 | Control (public) | REST API gateway / BFF — all web and mobile client traffic |
| `apps/gateway` | 3000 | Control (public) | Preview proxy — routes `/preview/{id}/*` to worker sandbox ports |
| `apps/orchestrator` | 3002 | Control (internal) | Session and preview route lifecycle (state machine authority) |
| `apps/collaboration` | 3003 | Control (internal) | WebSocket server — real-time presence, comments |
| `apps/ai-orchestration` | 3004 | Control (internal) | Provider configs, agent roles, pipeline definitions, run execution |
| `apps/worker-manager` | 3005 | Control (internal) | Worker host registration, capacity tracking, sandbox lease allocation |
| `apps/host-agent` | — | Worker | Runs on each worker VM — heartbeat loop, sandbox lifecycle reporting |
| `apps/session-reaper` | — | Background | Scans for idle sessions and orphaned leases; drives cleanup |
| `apps/usage-meter` | — | Background | Consumes usage events; records to DB; batch-uploads to billing adapter |
| `apps/web` | 3006 | Public | Next.js 14 (App Router) web front-end |
| `apps/mobile-ios` | — | Client | Swift/SwiftUI companion — auth, workspace/project/session views, preview |
| `apps/mobile-android` | — | Client | Kotlin/Compose companion — **skeleton only, no real screens** |

## Shared Package Map

| Package | What it owns | Who imports it |
|---------|-------------|----------------|
| `@udd/contracts` | Entity types, DTOs, enums, state transition tables, event topic names | Every service and package |
| `@udd/database` | Schema migrations, repository interfaces, PG implementations | api, orchestrator, collaboration, ai-orchestration, worker-manager, session-reaper, usage-meter, gateway |
| `@udd/auth` | JWT middleware, RBAC role→permission map, policy helpers | api, orchestrator, collaboration, ai-orchestration, worker-manager |
| `@udd/config` | Typed env var accessors (`required`, `optional`, `flag`) | Every service |
| `@udd/adapters` | All vendor boundaries (model providers, secrets, auth, git, storage, queue, billing, notifications) | api, ai-orchestration |
| `@udd/events` | Event publisher/consumer interfaces, SQS/Redis/Noop implementations | Every service |
| `@udd/observability` | JSON logger, metrics facade, OpenTelemetry tracing, health endpoints | Every service |
| `@udd/testing` | Test factories, fixtures, assertion helpers | Test suites only |

**Dependency rule:** `packages/contracts` has no `@udd/*` dependencies — it is the base. Packages must not import from `apps/`. Provider SDKs must only be imported within `packages/adapters/src/model-provider/`.

## Control Plane vs Worker Plane

```
Internet
  │
  └── ALB / Cloud Load Balancer
        │
        ├── apps/web       (3006)   Next.js SSR + static assets
        ├── apps/api       (3001)   REST API ──────────────────────┐
        └── apps/gateway   (3000)   Preview proxy ─────────────────┼──► worker-host:32000-33000
                                                                   │
        ┌──────────────── internal VPC only ────────────────────────┤
        │                                                           │
        ├── apps/orchestrator     (3002)                           │
        ├── apps/collaboration    (3003)                           │
        ├── apps/ai-orchestration (3004)                           │
        └── apps/worker-manager   (3005)   ◄── host-agent heartbeats

Worker plane (private subnet — no direct inbound internet):
  ├── worker-host-A  (host-agent + user sandboxes)
  └── worker-host-B  (host-agent + user sandboxes)

Background (no exposed ports):
  ├── apps/session-reaper
  └── apps/usage-meter
```

**The gateway is the only service that routes traffic to worker preview ports.** Sandbox breakout cannot reach control plane services directly. See ADR 001.

## Database Ownership

All services share a single PostgreSQL 16 instance. Tenancy isolation is enforced by the application layer (not PG RLS). Every table row carries `workspace_id` where applicable.

| Tables | Service that writes | Services that read |
|--------|--------------------|--------------------|
| `users`, `organizations`, `workspaces`, `memberships`, `role_grants` | api | auth middleware (all services) |
| `projects`, `project_repos`, `project_environments` | api | orchestrator |
| `sessions` | orchestrator, session-reaper | api, gateway (indirect) |
| `sandbox_leases` | worker-manager, session-reaper | orchestrator |
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

**Deployment:** GCP Cloud Run (services), Cloud SQL PostgreSQL 16 (database), GCR (container images), Cloud Storage (object storage).

**Application-layer adapters** support AWS services (SQS, S3, Secrets Manager) and can be reconfigured via env vars. The deployed Terraform (`infra/terraform/`) targets GCP.

**CI/CD:** GitHub Actions. Build and test on every PR. Deploy to dev (main branch), staging/prod (release/* branches with manual gates). See `.github/workflows/`.
