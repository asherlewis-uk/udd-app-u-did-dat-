# System Overview

## What this system is

UDD Platform is a multi-tenant cloud IDE and AI pipeline execution platform. Users create workspaces, run code in isolated sandbox sessions, expose running services via a secure preview proxy, and execute AI pipelines using configurable model providers.

The platform is a pnpm/Turborepo monorepo with:
- 9 backend Node.js/Express/TypeScript services
- 1 Next.js 14 web app
- 1 Swift/SwiftUI iOS companion app
- 1 Kotlin/Jetpack Compose Android companion app
- 8 shared TypeScript packages

## Build phase status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | **Complete** | Monorepo scaffolding, shared contracts, DB schema, service skeletons compilable |
| Phase 2 | **Complete** | Real DB repositories, adapter HTTP implementations, API handlers, tests |
| Phase 3 | **Pending approval** | UI overhaul, design system, web shell, AI/ops surfaces |

Phase 3 has not been started. Do not implement Phase 3 work without explicit user approval.

## Implementation status by component

| Component | Status | Detail |
|-----------|--------|--------|
| PostgreSQL repositories (all entities) | **Implemented** | Real SQL queries, optimistic locking |
| Session lifecycle state machine | **Implemented** | create → start → run ⇄ idle → stop, atomic transactions |
| Preview gateway proxy | **Implemented** | DB-authoritative route lookup, auth enforcement |
| Orchestrator lease allocation | **Implemented** | DB-direct via `FOR UPDATE SKIP LOCKED` on `worker_capacity` |
| Worker-manager capacity ingestion | **Implemented** | `POST /internal/capacity-snapshot` endpoint |
| Host agent — registration + heartbeat | **Implemented** | POSTs snapshots to worker-manager on startup and interval |
| Host agent — capacity measurement | **Stubbed** | `collectCapacitySnapshot()` returns hardcoded 10 slots, ports 32100–32109. TODO: query actual OS/container runtime |
| AI provider CRUD + secret manager | **Implemented** | GCP Secret Manager in production, InMemory in dev/test |
| Pipeline DAG validation + run execution | **Implemented** | Kahn's algorithm, async execution, idempotency key |
| WorkOS OAuth → JWT | **Implemented** | Code exchange, user upsert, signed JWT |
| RBAC permission matrix | **Implemented** | 5 roles, permission table in `packages/auth/src/rbac.ts` |
| Collaboration (WebSocket, comments) | **Implemented** | Presence tracking + DB-backed comments |
| iOS companion app | **Implemented** | PKCE auth, Keychain JWT, typed API client, all screens |
| Android companion app | **Partial** | Compose tab UI + Ktor API client implemented; scope-limited (status/review/comments only) |
| Session reaper | **Implemented** | Idle session detection, orphaned lease cleanup |
| Usage metering | **Implemented** | Event ingestion and DB recording |
| Web app UI | **Partial** | SWR hooks and page shells exist; design system is Phase 3 |
| MicroVM provisioning on worker hosts | **Not implemented** | Port allocation protocol exists; actual VM provisioning is not wired in host-agent |
| mTLS between planes | **Not implemented** | ADR 001 specifies it; endpoint comment notes "mTLS in prod" but not yet enforced |
| Billing adapter integration | **Stubbed** | `StripeBillingProvider` — all methods throw `NotImplementedError` |
| Notification adapter integration | **Stubbed** | `EmailNotificationProvider.send()` throws `NotImplementedError` |
| `model_invocation_logs` read surface | **Not implemented** | Write path exists; no read endpoints defined |

## Infrastructure

**Deployment target: GCP** — Cloud Run (services), Cloud SQL PostgreSQL 16, Memorystore (Redis), GCR (images), GCS (Terraform state, object storage), Cloud Scheduler (session-reaper triggers every 5 minutes).

The README states "AWS (ECS/Fargate, RDS...)" — this is inaccurate. All Terraform in `infra/terraform/` uses the `google` provider and targets GCP resources exclusively. The application-layer adapters (`@udd/adapters`) include AWS-compatible implementations for SQS and S3, but the production secret manager is `GCPSecretManagerProvider`, not `AWSSecretManagerProvider`.

## Deprecated framing — do not use

| Stale claim | What is true instead |
|-------------|---------------------|
| "Phase 1 skeleton / stub implementations" | Phase 2 complete — all skeletons replaced with real implementations |
| "Phase 2 not started" | Phase 2 complete as of 2026-04-11 |
| "AWS ECS/Fargate/RDS deployment" | GCP Cloud Run + Cloud SQL |
| "AWS Secrets Manager in production" | `GCPSecretManagerProvider` is the production implementation |
| "Android companion is a skeleton" | Android has real Compose UI + Ktor API client; it is partial, not skeletal |
| "HOST_AGENT queries actual sandbox capacity" | `collectCapacitySnapshot()` returns hardcoded values; actual OS query is a pending stub |
