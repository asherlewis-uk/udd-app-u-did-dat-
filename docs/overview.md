# System Overview

## What this system is

UDD Platform is a multi-tenant cloud IDE and AI pipeline execution platform. Users create workspaces, run code in isolated sandbox sessions, expose running services via a secure preview proxy, and execute AI pipelines using configurable model providers.

The platform is a pnpm/Turborepo monorepo with:
- 9 backend Node.js/Express/TypeScript services
- 1 Next.js 14 web app
- 1 Swift/SwiftUI iOS companion app
- 1 Kotlin/Compose Android companion (skeleton only)
- 8 shared TypeScript packages

## Build phase status

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | **Complete** | Monorepo scaffolding, shared contracts, DB schema, service skeletons compilable |
| Phase 2 | **Complete** | Real DB repositories, adapter HTTP implementations, API handlers, tests |
| Phase 3 | **Pending approval** | UI overhaul, design system, web shell, AI/ops surfaces |

Phase 3 has not been started. Do not implement Phase 3 work without explicit user approval.

## What is fully implemented (Phase 2 complete)

- PostgreSQL repositories for all entities (real SQL queries, not stubs)
- Session lifecycle state machine (create → start → run ⇄ idle → stop)
- Preview gateway proxy with DB-authoritative route lookup and auth enforcement
- Worker host registration, heartbeat loop, port lease allocation
- AI provider CRUD with external secret manager integration
- Pipeline definition (DAG validation via Kahn's algorithm) and async run execution
- WorkOS OAuth code exchange → JWT issuance
- RBAC permission matrix (5 roles: org_owner → workspace_admin → workspace_member → project_editor → project_viewer)
- Collaboration: WebSocket presence tracking + comments
- iOS companion app: PKCE auth, Keychain JWT, typed API client, all screens
- Session reaper: idle session detection, orphaned lease cleanup
- Usage metering: event ingestion and DB recording

## What is partial or stubbed

| Area | Status | Notes |
|------|--------|-------|
| Web app UI | **Partial** | SWR hooks and page shells exist; visual design system is Phase 3 |
| Android companion | **Skeleton** | `apps/mobile-android` has no real screens |
| MicroVM provisioning | **Stubbed** | Port allocation protocol is implemented; actual Firecracker/VM provisioning on worker hosts is not wired |
| mTLS between planes | **Not implemented** | ADR 001 specifies it for Phase 2; enforcement not yet present |
| Billing integration | **Stubbed** | Usage events recorded; `packages/adapters/src/billing.ts` adapter boundary exists; backend integration not connected |
| Notification adapter | **Stubbed** | `packages/adapters/src/notification.ts` boundary exists; no real delivery |
| `model_invocation_logs` query surface | **Partial** | Write path implemented; no read endpoints exposed yet |

## What this system is NOT

- Not a full VSCode server — the Monaco editor is present in the web app; the terminal and file system browsing are scaffold-only in Phase 2
- Not a container orchestrator — it relies on external VM provisioning by worker hosts
- Not a billing platform — billing logic lives behind the `BillingProvider` adapter and is external
- Not an auth provider — WorkOS AuthKit handles identity; this system issues scoped JWTs from it

## Infrastructure reality

**Deployment target: GCP** (Cloud Run, Cloud SQL, GCR)  
**Application adapters: AWS-compatible** (SQS, S3, Secrets Manager) with GCP alternatives

The README states "AWS (ECS/Fargate, RDS...)" — this is inaccurate. The Terraform modules in `infra/terraform/` and the CI/CD pipelines in `.github/workflows/deploy.yml` target Google Cloud Platform: Cloud Run for services, Cloud SQL for PostgreSQL, GCR for images. However, the application layer supports AWS services via adapters (`SqsEventPublisher`, `AWSSecretManagerProvider`, S3 storage adapter). Runbooks that reference `aws ecs` commands are deployment-assumption errors — see `docs/runbooks/worker-failure.md` for the corrected version.

The infrastructure target should be treated as GCP unless the Terraform explicitly changes.

## Deprecated framing — do not use

| Stale claim | What is true instead |
|-------------|---------------------|
| "Phase 1 skeleton / stub implementations" | Phase 2 is complete — all skeletons replaced with real implementations |
| "Phase 2 not started" | Phase 2 complete as of 2026-04-11 |
| "AWS ECS/Fargate deployment" | GCP Cloud Run deployment |
| Any context file saying Phase 2 is pending | Stale; Phase 2 is done |
| "Android companion ready" | Android is skeleton only |
