# Service Catalog

Back to [docs/\_INDEX.md](./_INDEX.md).

## Repo-owned clients

| Component             | Purpose                                                                               | Depends on                                           | Class    | In canonical architecture? |
| --------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------- | -------------------------- |
| `apps/web`            | Primary hosted web client for auth, projects, sessions, previews, and AI surfaces     | `apps/api`, hosted auth flow, hosted preview gateway | Core     | Yes                        |
| `apps/mobile-ios`     | First-class iOS client for auth, projects, sessions, previews, comments, and settings | `apps/api`, `apps/gateway`, hosted auth flow         | Core     | Yes                        |
| `apps/mobile-android` | Additional mobile companion surface                                                   | `apps/api`                                           | Optional | No                         |

## Repo-owned hosted services and background processes

| Component               | Purpose                                                                                                                                                | Depends on                                                                         | Class                        | In canonical architecture? | Deployment status |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------- | -------------------------- | ----------------- |
| `apps/api`              | Public API and BFF for web and iOS                                                                                                                     | `packages/auth`, `packages/database`, `apps/orchestrator`, `apps/ai-orchestration` | Core                         | Yes                        | **ACTIVE / DEPLOYED** to Cloud Run (us-central1). Cloud Build config exists. Image published. |
| `apps/gateway`          | Hosted preview ingress and proxy                                                                                                                       | `packages/auth`, `packages/database`                                               | Core                         | Yes                        | **ACTIVE / DEPLOYED** to Cloud Run (us-central1). Cloud Build config exists. Image published. |
| `apps/orchestrator`     | Session lifecycle, runtime allocation, preview route lifecycle                                                                                         | `packages/database`, `packages/events`                                             | Core                         | Yes                        | **ACTIVE / DEPLOYED** to Cloud Run (us-central1). Cloud Build config exists. Image published. |
| `apps/ai-orchestration` | Provider configs, pipeline runs, model invocation, secret resolution                                                                                   | `packages/adapters`, `packages/database`, `packages/events`                        | Core                         | Yes                        | Deployed to Cloud Run (us-central1). Cloud Build config exists. Image published. |
| `apps/worker-manager`   | Capacity snapshot ingestion and worker-capacity persistence (Cloud Run Service in Terraform)                                                           | `packages/database`                                                                | Core                         | Yes                        | Deployed to Cloud Run (us-central1). Cloud Build config exists. Image published. |
| `apps/host-agent`       | Runtime-host registration and heartbeat publication                                                                                                    | `apps/worker-manager`, runtime hosts                                               | Core                         | Yes                        | Not deployed. Runs only as local dev process. No Cloud Run resource defined. |
| `apps/session-reaper`   | Idle-session cleanup and orphaned-lease cleanup (scheduled single-invocation job; code runs in single-cycle-and-exit mode)                              | `packages/database`, `packages/events`                                             | Core                         | Yes                        | **ACTIVE / DEPLOYED** to Cloud Run (us-central1). Cloud Build config exists. Image published. Runs as Cloud Run Job. |
| `apps/usage-meter`      | Internal usage event recording                                                                                                                         | `packages/database`                                                                | Core                         | Yes                        | **ACTIVE / DEPLOYED** to Cloud Run (us-central1). Cloud Build config exists. Image published. |
| `apps/collaboration`    | Comments, presence, real-time state fan-out (Pusher refactor pending per [ADR 015](./adr/015-canonical-hosted-baseline-and-middleware.md))              | `packages/database`, `packages/events`, Pusher SDK (pending)                       | Pending Refactor (Pusher)    | Yes (after Pusher refactor) | Terraform Cloud Run resource defined with Pusher env vars wired. Cloud Build config exists (`cloudbuild.collaboration.yaml`). Included in CI build matrix. Pusher SDK refactor still pending. |

## Shared packages

| Component                | Purpose                                                              | Depends on                              | Class            | In canonical architecture? |
| ------------------------ | -------------------------------------------------------------------- | --------------------------------------- | ---------------- | -------------------------- |
| `packages/contracts`     | Shared entities, DTOs, events, enums                                 | None of the other `@udd/*` packages     | Core             | Yes                        |
| `packages/config`        | Typed config accessors and defaults                                  | Environment variables                   | Core             | Yes                        |
| `packages/auth`          | JWT auth context and permission logic                                | `packages/contracts`                    | Core             | Yes                        |
| `packages/database`      | Schema and repositories                                              | PostgreSQL                              | Core             | Yes                        |
| `packages/adapters`      | Provider, secret, auth, git, storage, billing, notification adapters | External provider SDKs                  | Core and adapter | Yes                        |
| `packages/events`        | Event publishing abstraction                                         | Queue providers                         | Core             | Yes                        |
| `packages/observability` | Logging, health, metrics, tracing helpers                            | stdout, metrics exporter if wired       | Core             | Yes                        |
| `packages/testing`       | Test utilities                                                       | `packages/contracts`, `packages/events` | Optional         | No                         |

## External dependencies implied by the repo

| Dependency              | Purpose                                 | Repo touchpoint                                   | Class    | In canonical architecture? |
| ----------------------- | --------------------------------------- | ------------------------------------------------- | -------- | -------------------------- |
| PostgreSQL              | Primary state store                     | `packages/database`                               | Core     | Yes                        |
| Redis                   | Shared cache or coordination support    | `packages/config`, app env wiring                 | Core     | Yes                        |
| WorkOS                  | Auth provider                           | `packages/adapters`, web and iOS auth flows       | Core     | Yes                        |
| GCP Secret Manager      | Production provider secret storage      | `packages/adapters`, `apps/ai-orchestration`      | Core     | Yes                        |
| Hosted compute platform | GCP Cloud Run (canonical per [ADR 015](./adr/015-canonical-hosted-baseline-and-middleware.md)) | `infra/terraform`, Cloud Build configs         | Core     | Yes                        |
| Queue provider          | GCP Pub/Sub event delivery                          | `packages/events`                                 | Core     | Yes                        |
| Git providers           | Import and export project repos         | `packages/adapters`, project repo tables          | Adapter  | Yes                        |
| Object storage          | Artifact and snapshot persistence (GCS) | `packages/adapters`, checkpoint manifests         | Adapter  | Yes                        |
| Pusher                  | Managed real-time middleware ([ADR 015](./adr/015-canonical-hosted-baseline-and-middleware.md)) | `apps/collaboration` (pending refactor)  | Core     | Yes                        |
| Billing provider        | Usage monetization                      | `packages/adapters`, `apps/usage-meter`           | Optional | No                         |

## Catalog notes

- Web and iOS are first-class client surfaces.
- Collaboration is present in code and pending refactor to Pusher SDK ([ADR 015](./adr/015-canonical-hosted-baseline-and-middleware.md)). Not frozen — active refactor path exists.
- Android exists in the repo, but it is not part of the canonical first-class client commitment.
- Export, billing, storage, queue, and git integrations are adapters. They matter, but they are not the product center.
- If a service or dependency conflicts with [docs/product-scope.md](./product-scope.md) or [docs/architecture.md](./architecture.md), record it in [docs/implementation-gaps.md](./implementation-gaps.md) instead of silently promoting it to canonical.
- **Deployment reality (2026-04-19):** `api`, `gateway`, `orchestrator`, `session-reaper`, `usage-meter`, `ai-orchestration`, and `worker-manager` are all **ACTIVE / DEPLOYED** to Cloud Run (us-central1). `collaboration` has a Terraform Cloud Run resource, Cloud Build config (`cloudbuild.collaboration.yaml`), and is included in the CI build matrix. Pusher SDK refactor still pending. See [current-blockers-and-resolution-options.md](./current-blockers-and-resolution-options.md).
