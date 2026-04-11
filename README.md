# UDD Platform

A production-grade multi-platform cloud IDE and execution platform.

## Architecture

- **Web app**: Next.js 14 + TypeScript (App Router)
- **Backend services**: Node.js + Express + TypeScript
- **Database**: PostgreSQL 16
- **Auth**: WorkOS AuthKit + custom RBAC
- **AI**: User-configurable multi-provider orchestration via ModelProviderAdapter boundary
- **Infrastructure**: AWS (ECS/Fargate, RDS, ElastiCache, S3, SQS, Secrets Manager)

## Monorepo Structure

```
apps/
  web/              Next.js web app
  api/              API Gateway / BFF (port 3001)
  gateway/          Preview proxy gateway (port 3000)
  orchestrator/     Session + preview route orchestration (port 3002)
  collaboration/    Presence, comments, WebSocket (port 3003)
  ai-orchestration/ AI provider/role/pipeline/run management (port 3004)
  worker-manager/   Worker capacity + allocation (port 3005)
  host-agent/       Runs on each worker host
  session-reaper/   Idle session + orphan lease cleanup
  usage-meter/      Usage event ingestion
  mobile-ios/       Swift + SwiftUI companion app
  mobile-android/   Kotlin + Jetpack Compose companion app

packages/
  contracts/        Shared types, interfaces, DTOs (source of truth)
  database/         Schema, migrations, repository interfaces
  auth/             RBAC, JWT middleware, policy helpers
  events/           Event topic definitions, publisher/consumer interfaces
  observability/    Structured logger, metrics, tracing, health endpoints
  config/           Environment variable schema
  adapters/         Vendor isolation — ModelProviderAdapter + all boundaries
  testing/          Test factories, fixtures, assertion helpers

infra/
  terraform/        AWS infrastructure modules + dev/staging/prod environments
docs/
  adr/              Architecture Decision Records
  runbooks/         Operational runbooks
```

## Quick Start

See [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md) for full setup instructions.

```bash
pnpm install
pnpm build --filter="./packages/*"
pnpm dev
```

## Key Design Principles

1. **ModelProviderAdapter boundary** — all AI model calls go through `packages/adapters`. No direct provider SDK usage elsewhere.
2. **Secrets in external manager** — credentials are never stored in the DB. Only `secretRef` references.
3. **Port-mapped preview proxy** — `yourdomain.com/preview/{preview_id}` → `worker-host:allocated_port`. Gateway enforces auth + lease validity.
4. **Optimistic concurrency** — sessions, sandbox leases, and preview routes use a `version` column.
5. **Audit everything** — all mutations emit audit events with no secret values.
6. **Worker plane isolation** — only the gateway tier can reach worker preview ports.

## Phase Status

- **Phase 1** (Foundations): Monorepo scaffolded, contracts defined, schemas created, service skeletons compilable.
- **Phase 2** (Logic): Business logic, real DB queries, adapter implementations, tests.
- **Phase 3** (UI): Design system, flagship web shell, AI and ops surfaces.
