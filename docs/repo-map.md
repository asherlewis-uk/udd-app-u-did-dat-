# Repo Map

## Where to Look First

| I need to... | Look here |
|---|---|
| Change REST API behavior (routes, handlers) | `apps/api/src/routes/` |
| Change session lifecycle or lease allocation logic | `apps/orchestrator/src/services/session.ts` — lease allocation happens here via DB transaction, not via HTTP to worker-manager |
| Change preview proxy behavior | `apps/gateway/src/proxy.ts`, `apps/gateway/src/registry.ts` |
| Change RBAC roles or permissions | `packages/auth/src/rbac.ts` |
| Change permission policy helpers | `packages/auth/src/policies.ts` |
| Add or modify a DB table | `packages/database/src/migrations/` (new file) |
| Change a repository query | `packages/database/src/repositories/pg/{entity}.ts` |
| Change entity type definitions | `packages/contracts/src/entities.ts` |
| Change API request/response shapes | `packages/contracts/src/api.ts` |
| Change state machine transitions | `packages/contracts/src/enums.ts` (SESSION_TRANSITIONS, etc.) |
| Add or change event topics | `packages/contracts/src/events.ts` + `packages/events/src/` |
| Change AI provider invocation | `packages/adapters/src/model-provider/{provider}.ts` |
| Add a new AI provider | `packages/adapters/src/model-provider/` + `registry.ts` + `packages/contracts/src/enums.ts` |
| Change secret manager behavior | `packages/adapters/src/secret-manager.ts` |
| Change env var definitions or defaults | `packages/config/src/index.ts` — then update `docs/ENV_CONTRACT.md` |
| Change capacity snapshot ingestion | `apps/worker-manager/src/app.ts` — single endpoint: `POST /internal/capacity-snapshot` |
| Change host agent heartbeat or registration | `apps/host-agent/src/agent.ts` |
| Implement real capacity measurement (stub) | `apps/host-agent/src/agent.ts`, `collectCapacitySnapshot()` |
| Change DAG validation for pipelines | `apps/ai-orchestration/src/dag-validator.ts` |
| Change collaboration / presence logic | `apps/collaboration/src/` |
| Change idle session detection | `apps/session-reaper/src/index.ts` |
| Change usage event recording | `apps/usage-meter/src/index.ts` |
| Change web app pages | `apps/web/src/app/` (Next.js App Router) |
| Change web app data fetching | `apps/web/src/hooks/` (SWR hooks) |
| Change iOS companion | `apps/mobile-ios/Sources/App/` |
| Change infrastructure (GCP) | `infra/terraform/` |
| Change CI/CD pipelines | `.github/workflows/` |
| Change test utilities / factories | `packages/testing/src/` |

## Package Import Rules

1. `packages/contracts` — no `@udd/*` dependencies. It is the base layer. Never import other packages here.
2. `packages/` may import other `packages/` but never import from `apps/`.
3. `apps/` may import any `packages/`.
4. Provider SDKs (`@anthropic-ai/sdk`, `openai`, `@google-ai/*`) may **only** be imported inside `packages/adapters/src/model-provider/`. ESLint enforces this.
5. Direct PostgreSQL (`pg`) queries may only appear in `packages/database/src/repositories/pg/`. Services use repository interfaces, not raw `pg`.
6. `process.env` direct access is not permitted. Use `packages/config/src/index.ts` accessors.

## Key Source Files

| File | What it is |
|------|-----------|
| `packages/contracts/src/entities.ts` | Authoritative TypeScript types for all domain entities |
| `packages/contracts/src/enums.ts` | All enums + valid state transition tables (SESSION_TRANSITIONS, etc.) |
| `packages/contracts/src/api.ts` | All API request/response DTO types |
| `packages/contracts/src/events.ts` | Event topic constants and event payload types |
| `packages/contracts/src/ai.ts` | AI-specific types: ProviderConfig, AgentRole, PipelineDefinition, PipelineRun |
| `packages/auth/src/rbac.ts` | Role → permission mapping; the authority on who can do what |
| `packages/auth/src/middleware.ts` | JWT validation and auth context extraction |
| `packages/database/src/migrations/` | SQL migration files in sequential order (schema source of truth) |
| `packages/config/src/index.ts` | All env var definitions with types and defaults |
| `packages/adapters/src/model-provider/base.ts` | ModelProviderAdapter interface |
| `packages/adapters/src/model-provider/registry.ts` | Adapter registry — routes by ProviderType |
| `apps/orchestrator/src/services/session.ts` | Session state machine implementation |
| `apps/gateway/src/registry.ts` | DB-authoritative preview route lookup |
| `apps/gateway/src/proxy.ts` | Preview proxy middleware wiring |
| `apps/ai-orchestration/src/dag-validator.ts` | Pipeline DAG validation (Kahn's algorithm) |
| `apps/api/src/context.ts` | API service context wiring (repositories, adapters) |
| `apps/ai-orchestration/src/context.ts` | AI orchestration context (secret manager selection) |

## Migration Files

Migrations are in `packages/database/src/migrations/`, named with a numeric prefix:

| File | Contents |
|------|----------|
| `001_initial_schema.sql` | Core tables: users, orgs, workspaces, memberships, projects, sessions, sandbox_leases, preview_routes, comments, audit_logs |
| `002_ai_orchestration.sql` | AI tables: provider_configs, agent_roles, pipeline_definitions, pipeline_runs, model_invocation_logs |
| `003_fix_sandbox_lease_constraint.sql` | Constraint refinement |
| `004_schema_hardening.sql` | Indexes and constraint optimization |
| `005_worker_host_constraint.sql` | Worker host validation |

New migrations must be named with the next sequential prefix and must be idempotent.

## Turborepo Task Graph

```
typecheck, test, lint
    depend on → build
        depends on → ^build (build dependency packages before dependents)
```

**Local build order:**
```bash
pnpm build --filter="./packages/*"   # Build all shared packages first
pnpm dev                              # Start all services in parallel (watch mode)
```

**Test types:**
- `pnpm test:unit` — unit tests only (fast, no DB)
- `pnpm test:integration` — integration tests (requires DB + Redis running)
- `pnpm test` — all tests

## Load Tests

`k6/` contains load test scripts for gateway and API throughput. Run manually before any change to preview proxying or session creation performance.
