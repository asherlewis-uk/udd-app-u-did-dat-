# GEMINI — UDD Platform Agent Entrypoint

This file is the primary context entrypoint for agents building in the UDD Platform monorepo.
Start here. Then read the specific docs listed below for the area you are working in.

**Do not treat `docs/archive/` as authoritative. Do not treat `README.md` as the primary architecture reference — it contains an infrastructure inaccuracy (see below).**

---

## What this repo is

A multi-tenant cloud IDE and AI pipeline execution platform.
- 9 backend Node.js/Express/TypeScript services
- 1 Next.js 14 web app
- 1 Swift/SwiftUI iOS companion app (complete)
- 1 Kotlin/Compose Android companion (skeleton only)
- 8 shared TypeScript packages

**Build status:** Phase 1 (scaffolding) and Phase 2 (real logic) are complete. Phase 3 (UI overhaul) is pending explicit user approval — do not implement it.

---

## Authoritative documentation

Read in this order based on what you are doing:

| Situation | Read |
|-----------|------|
| First time in the repo | `docs/overview.md` → `docs/architecture.md` |
| Making any code change | `docs/constraints.md` → `docs/change-protocol.md` |
| Working with sessions, previews, workers, or pipelines | `docs/runtime.md` + `docs/flows.md` |
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
- Control plane (public + internal): `apps/api` (3001), `apps/gateway` (3000), `apps/orchestrator` (3002), `apps/collaboration` (3003), `apps/ai-orchestration` (3004), `apps/worker-manager` (3005)
- Worker plane (private subnet): worker hosts running user sandboxes via `apps/host-agent`
- Background: `apps/session-reaper`, `apps/usage-meter`
- Web: `apps/web` (Next.js 14, port 3006)

**Shared packages (build these first):**
`@udd/contracts` → `@udd/database` → `@udd/auth` → `@udd/config` → `@udd/adapters` → `@udd/events` → `@udd/observability` → `@udd/testing`

**Database:** Single PostgreSQL 16 instance. All rows carry `workspace_id` for tenancy isolation. No PostgreSQL RLS — enforced in application layer.

**Deployment:** GCP Cloud Run + Cloud SQL (not AWS ECS — README is incorrect on this point).

---

## The most important constraints

Violating any of these will cause a security or correctness defect:

1. **Every DB query for workspace data must filter by `workspace_id` from the JWT** — not from client-supplied body params.
2. **No plaintext credentials in the DB, logs, or audit events.** DB stores `credential_secret_ref` only.
3. **All AI model calls go through `ModelProviderAdapter`** — no direct `@anthropic-ai/sdk`, `openai`, or `@google-ai/*` imports outside `packages/adapters/src/model-provider/`.
4. **Gateway must do a DB-authoritative route lookup on every request** — no caching of preview route bindings.
5. **Preview route ID alone does not grant access** — auth + workspace membership + route active + not expired must all pass.
6. **sessions, sandbox_leases, and preview_routes use `version`-based optimistic locking** — all updates must check and increment `version`.
7. **`InMemorySecretManagerProvider` is never used in staging or production** — only `NODE_ENV=development|test`.

Full invariant list: `docs/constraints.md`

---

## Common wrong assumptions — avoid these

| Wrong assumption | What is actually true |
|-----------------|----------------------|
| The repo uses AWS ECS/Fargate in production | Deployment target is GCP Cloud Run. Application adapters support AWS services but Terraform deploys to GCP. |
| Phase 1 skeletons/stubs are still present | Phase 2 is complete. All skeletons have real implementations. Verify in code before assuming something is stubbed. |
| Phase 3 work is underway | Phase 3 has not started and requires user approval. |
| Caching preview route bindings is safe | It is not. Gateway must read from DB on every request. |
| The JWT always reflects current workspace membership | Membership is resolved at token issuance. Always verify current membership from DB for mutations. |
| Android companion has real screens | It is a skeleton only. |
| Worker VMs are Firecracker instances | Port allocation is implemented; actual VM provisioning is not yet wired. |
| I can use `process.env` directly | Use `packages/config/src/index.ts` accessors only. |

---

## Repo shape (where things live)

```
packages/contracts/     ← All shared types, DTOs, enums, event topics (start here for types)
packages/database/      ← Schema migrations + PG repository implementations
packages/auth/          ← JWT middleware, RBAC, policies
packages/config/        ← Typed env var accessors
packages/adapters/      ← ALL vendor boundaries (AI providers, secrets, storage, etc.)
packages/events/        ← Event pub/sub implementations
packages/observability/ ← Logger, metrics, tracing, health endpoints

apps/api/               ← REST API gateway / BFF (port 3001)
apps/gateway/           ← Preview proxy (port 3000) — DB-authoritative route lookup
apps/orchestrator/      ← Session + preview lifecycle state machine (port 3002)
apps/collaboration/     ← WebSocket, presence, comments (port 3003)
apps/ai-orchestration/  ← Provider configs, pipelines, run execution (port 3004)
apps/worker-manager/    ← Worker registration, lease allocation (port 3005)
apps/host-agent/        ← Runs on worker VMs — heartbeat, capacity reporting
apps/session-reaper/    ← Background: idle session + orphan lease cleanup
apps/usage-meter/       ← Background: usage event ingestion
apps/web/               ← Next.js 14 web app (port 3006)
apps/mobile-ios/        ← Swift/SwiftUI companion (complete)
apps/mobile-android/    ← Kotlin/Compose companion (skeleton)

infra/terraform/        ← GCP infrastructure (Cloud Run, Cloud SQL)
.github/workflows/      ← CI/CD (build, test, lint, deploy to GCP)
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
- `README.md` as architecture source — use `docs/architecture.md` instead; README has infrastructure inaccuracy
- Any prior session memory or context files describing "Phase 2 not started" — Phase 2 is complete
