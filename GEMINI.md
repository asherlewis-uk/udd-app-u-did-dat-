# GEMINI — UDD Platform Agent Entrypoint

This file is the primary context entrypoint for agents building in the UDD Platform monorepo.
Start here. Then read the specific docs listed below for the area you are working in.

**Do not treat `docs/archive/` as authoritative.**  
**Do not treat `README.md` as the architecture reference — it contains infrastructure and phase-status inaccuracies.**  
**The authoritative index is `docs/_INDEX.md`.**

---

## What this repo is

A multi-tenant cloud IDE and AI pipeline execution platform.
- 9 backend Node.js/Express/TypeScript services
- 1 Next.js 14 web app
- 1 Swift/SwiftUI iOS companion app (fully implemented)
- 1 Kotlin/Jetpack Compose Android companion app (partial — tab UI + API client exist; full scope not yet built)
- 8 shared TypeScript packages

**Build status:** Phase 1 (scaffolding) and Phase 2 (real logic) are complete. Phase 3 (UI overhaul) is pending explicit user approval — do not implement it.

---

## Authoritative documentation

Read in this order based on what you are doing:

| Situation | Read |
|-----------|------|
| First time in the repo | `docs/overview.md` → `docs/architecture.md` |
| Making any code change | `docs/constraints.md` → `docs/change-protocol.md` |
| Working with sessions, workers, or previews | `docs/runtime.md` + `docs/flows.md` |
| Working with pipeline execution | `docs/runtime.md` (pipeline section) + `docs/flows.md` |
| Changing shared types or events | `docs/contracts.md` |
| Finding where code lives | `docs/repo-map.md` |
| Preparing to merge | `docs/quality-gates.md` |
| Checking env vars | `docs/ENV_CONTRACT.md` |
| Setting up locally | `docs/LOCAL_DEV.md` |
| Investigating a production issue | `docs/runbooks/` |
| Understanding an architectural decision | `docs/adr/001` through `docs/adr/006` |

Full index: `docs/_INDEX.md`

---

## Architecture in brief

**Two-plane model:**
- Control plane (public): `apps/api` (3001), `apps/gateway` (3000)
- Control plane (internal): `apps/orchestrator` (3002), `apps/collaboration` (3003), `apps/ai-orchestration` (3004), `apps/worker-manager` (3005)
- Worker plane (private subnet): worker hosts running user sandboxes, managed by `apps/host-agent`
- Background (Cloud Run Jobs): `apps/session-reaper` (Cloud Scheduler every 5 min), `apps/usage-meter`
- Web: `apps/web` (Next.js 14, port 3006)

**Critical architecture fact — lease allocation:**
The orchestrator does NOT call worker-manager via HTTP to allocate leases. It queries `worker_capacity` directly via `PgWorkerCapacityRepository.findHealthyWithLock()` using `FOR UPDATE SKIP LOCKED`, then creates the lease in the same DB transaction. Worker-manager only ingests capacity snapshots from host agents (`POST /internal/capacity-snapshot`).

**Shared packages (build these first):**
`@udd/contracts` → `@udd/database` → `@udd/auth` → `@udd/config` → `@udd/adapters` → `@udd/events` → `@udd/observability` → `@udd/testing`

**Database:** Single PostgreSQL 16 instance (Cloud SQL). All rows carry `workspace_id` for tenancy isolation. No PostgreSQL RLS — enforced in application layer.

**Deployment:** GCP Cloud Run + Cloud SQL + Memorystore. Not AWS ECS. `infra/terraform/` uses the `hashicorp/google` provider exclusively.

**Secret manager in production:** `GCPSecretManagerProvider`, selected by `NODE_ENV === 'production'` in `apps/ai-orchestration/src/context.ts`. Not controlled by an env var.

---

## The most important constraints

Violating any of these causes a security or correctness defect:

1. **Every DB query for workspace data must filter by `workspace_id` from the JWT** — not from client-supplied body params.
2. **No plaintext credentials in the DB, logs, or audit events.** DB stores `credential_secret_ref` (GCP Secret Manager resource name) only.
3. **All AI model calls go through `ModelProviderAdapter`** — no direct provider SDK imports outside `packages/adapters/src/model-provider/`.
4. **Gateway must do a DB-authoritative route lookup on every request** — no caching of preview route bindings.
5. **Preview route ID alone does not grant access** — auth + workspace membership + route active + not expired must all pass.
6. **sessions, sandbox_leases, and preview_routes use `version`-based optimistic locking** — all updates must check and increment `version`.
7. **Lease allocation and session state update must be atomic** — single DB transaction in `PgSessionService.startSession`. Do not split.
8. **`InMemorySecretManagerProvider` must not run with `NODE_ENV=production`** — the check is in `apps/ai-orchestration/src/context.ts`, not in `packages/config`.

Full invariant list: `docs/constraints.md`

---

## What is implemented vs stubbed

| Component | Status |
|-----------|--------|
| Session lifecycle, preview proxy, RBAC, orchestration | Implemented |
| Worker-manager capacity ingestion | Implemented |
| Host agent registration + heartbeat | Implemented |
| **Host agent capacity measurement** | **Stubbed** — hardcoded 10 slots, ports 32100–32109, TODO comment |
| **MicroVM provisioning** | **Not implemented** — port allocation works, no VMs are created |
| **mTLS between planes** | **Not implemented** — planned, not enforced |
| **Billing adapter (`StripeBillingProvider`)** | **Stubbed** — all methods throw `NotImplementedError` |
| **Notification adapter** | **Stubbed** — `send()` throws `NotImplementedError` |
| iOS companion | Implemented |
| Android companion | Partial — tab UI + 2 API endpoints exist; full scope unbuilt |
| Web app UI design system | Not started (Phase 3) |

---

## Common wrong assumptions — avoid these

| Wrong assumption | What is actually true |
|-----------------|----------------------|
| "README says AWS infrastructure" | Deployment is GCP Cloud Run + Cloud SQL. `infra/terraform/` is GCP-only. |
| "AWS Secrets Manager in production" | `GCPSecretManagerProvider` is the production implementation (code-confirmed). |
| "Orchestrator calls worker-manager HTTP for lease allocation" | Orchestrator queries `worker_capacity` DB directly; worker-manager only ingests snapshots. |
| "Worker hosts report actual sandbox capacity" | `collectCapacitySnapshot()` in host-agent returns hardcoded values. It is a stub. |
| "Phase 1 skeletons still present" | Phase 2 is complete. Verify in code before assuming something is stubbed. |
| "Phase 3 work is underway" | Phase 3 requires user approval and has not started. |
| "Android companion is a skeleton" | Android has real Compose UI and API client; it is partial, not skeletal. |
| "InMemorySecretManagerProvider check is in packages/config" | It is in `apps/ai-orchestration/src/context.ts`. |
| "docker-compose.yml exists in the repo" | It does not. Create it manually. See `docs/LOCAL_DEV.md`. |
| "Session reaper runs as a long-lived service" | In production it is a Cloud Run Job triggered by Cloud Scheduler every 5 minutes. |

---

## Repo shape (where things live)

```
packages/contracts/     ← Shared types, DTOs, enums, event topics (base layer — no deps)
packages/database/      ← Schema migrations + PG repository implementations
packages/auth/          ← JWT middleware, RBAC, policies
packages/config/        ← Typed env var accessors (no process.env direct access elsewhere)
packages/adapters/      ← ALL vendor boundaries (AI, GCP secrets, storage, queue, billing, notifications)
packages/events/        ← Event pub/sub implementations (SQS, Noop)
packages/observability/ ← Logger, metrics, tracing, health endpoints

apps/api/               ← REST API gateway / BFF (port 3001)
apps/gateway/           ← Preview proxy (port 3000) — DB-authoritative, no-cache route lookup
apps/orchestrator/      ← Session lifecycle + atomic DB-direct lease allocation (port 3002)
apps/collaboration/     ← WebSocket, presence, comments (port 3003)
apps/ai-orchestration/  ← Provider configs, pipelines, GCP secret manager (port 3004)
apps/worker-manager/    ← Capacity snapshot ingestion only (port 3005)
apps/host-agent/        ← Registration + heartbeat; capacity stub (see priority-map.md)
apps/session-reaper/    ← Cloud Run Job: idle session + orphan lease cleanup
apps/usage-meter/       ← Cloud Run Job: usage event ingestion
apps/web/               ← Next.js 14 web app (port 3006)
apps/mobile-ios/        ← Swift/SwiftUI companion (fully implemented)
apps/mobile-android/    ← Kotlin/Compose companion (partial — tab UI + API client)

infra/terraform/        ← GCP infrastructure exclusively (Cloud Run, Cloud SQL, Memorystore)
.github/workflows/      ← CI/CD: build+test on PR, deploy to GCP Cloud Run
k6/                     ← Load test scripts
```

Detailed "look here first" table: `docs/repo-map.md`

---

## Before committing anything

```bash
pnpm typecheck    # Zero errors
pnpm lint         # Zero violations
pnpm test         # All tests pass
pnpm format:check # Formatting clean
pnpm build        # Builds succeed
```

Full acceptance checklist: `docs/quality-gates.md`

---

## What NOT to load

- `docs/archive/` — non-authoritative, excluded from implementation context
- `README.md` as architecture source — use `docs/architecture.md`; README has AWS infrastructure claim and stale phase status
- Any prior session memory or context files describing "Phase 2 not started" or "Android is skeleton" — both are stale
