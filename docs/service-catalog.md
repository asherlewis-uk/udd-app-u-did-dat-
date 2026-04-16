# Service Catalog

Back to [docs/\_INDEX.md](./_INDEX.md).

## Repo-owned clients

| Component             | Purpose                                                                               | Depends on                                           | Class    | In canonical architecture? |
| --------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------- | -------- | -------------------------- |
| `apps/web`            | Primary hosted web client for auth, projects, sessions, previews, and AI surfaces     | `apps/api`, hosted auth flow, hosted preview gateway | Core     | Yes                        |
| `apps/mobile-ios`     | First-class iOS client for auth, projects, sessions, previews, comments, and settings | `apps/api`, `apps/gateway`, hosted auth flow         | Core     | Yes                        |
| `apps/mobile-android` | Additional mobile companion surface                                                   | `apps/api`                                           | Optional | No                         |

## Repo-owned hosted services and background processes

| Component               | Purpose                                                                                                                                                | Depends on                                                                         | Class                        | In canonical architecture? |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | ---------------------------- | -------------------------- |
| `apps/api`              | Public API and BFF for web and iOS                                                                                                                     | `packages/auth`, `packages/database`, `apps/orchestrator`, `apps/ai-orchestration` | Core                         | Yes                        |
| `apps/gateway`          | Hosted preview ingress and proxy                                                                                                                       | `packages/auth`, `packages/database`                                               | Core                         | Yes                        |
| `apps/orchestrator`     | Session lifecycle, runtime allocation, preview route lifecycle                                                                                         | `packages/database`, `packages/events`                                             | Core                         | Yes                        |
| `apps/ai-orchestration` | Provider configs, pipeline runs, model invocation, secret resolution                                                                                   | `packages/adapters`, `packages/database`, `packages/events`                        | Core                         | Yes                        |
| `apps/worker-manager`   | Capacity snapshot ingestion and worker-capacity persistence (Cloud Run Service in Terraform)                                                           | `packages/database`                                                                | Core                         | Yes                        |
| `apps/host-agent`       | Runtime-host registration and heartbeat publication                                                                                                    | `apps/worker-manager`, runtime hosts                                               | Core                         | Yes                        |
| `apps/session-reaper`   | Idle-session cleanup and orphaned-lease cleanup (scheduled single-invocation job; code runs in single-cycle-and-exit mode)                              | `packages/database`, `packages/events`                                             | Core                         | Yes                        |
| `apps/usage-meter`      | Internal usage event recording                                                                                                                         | `packages/database`                                                                | Optional                     | No                         |
| `apps/collaboration`    | Comments, presence, websocket fan-out                                                                                                                  | `packages/database`, `packages/events`                                             | Optional (frozen as dormant) | No                         |

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
| Hosted compute platform | Run public services and background jobs | `infra/terraform`, `.github/workflows/deploy.yml` | Core     | Yes                        |
| Queue provider          | Event delivery                          | `packages/events`                                 | Adapter  | Yes                        |
| Git providers           | Import and export project repos         | `packages/adapters`, project repo tables          | Adapter  | Yes                        |
| Object storage          | Artifact and snapshot persistence       | `packages/adapters`, checkpoint manifests         | Adapter  | Yes                        |
| Billing provider        | Usage monetization                      | `packages/adapters`, `apps/usage-meter`           | Optional | No                         |

## Catalog notes

- Web and iOS are first-class client surfaces.
- Collaboration is present in code but frozen as dormant: no new feature work is scoped, but it is not removed from the repo.
- Android exists in the repo, but it is not part of the canonical first-class client commitment.
- Export, billing, storage, queue, and git integrations are adapters. They matter, but they are not the product center.
- If a service or dependency conflicts with [docs/product-scope.md](./product-scope.md) or [docs/architecture.md](./architecture.md), record it in [docs/implementation-gaps.md](./implementation-gaps.md) instead of silently promoting it to canonical.
