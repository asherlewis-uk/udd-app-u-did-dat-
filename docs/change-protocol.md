# Change Protocol

How to make changes safely across this repo. Read `docs/constraints.md` before any change that touches tenancy, credentials, preview routing, or the worker plane.

---

## Before starting any change

1. Read the affected file(s) — do not propose changes to code you haven't read.
2. Check `packages/contracts/src/` for the types governing the change.
3. Identify downstream consumers: which other services import the type, call the endpoint, or consume the event you are changing.
4. Run `pnpm typecheck` after any change to `packages/contracts/` — type errors will surface in all consumers.

---

## Schema changes

1. Create a new file in `packages/database/src/migrations/` with the next sequential numeric prefix (e.g., `006_...sql`).
2. Migrations are **additive only** in a single deploy — add columns (nullable or with safe defaults), add tables, add indexes. Never drop or rename in the same migration.
3. Indexes must use `CREATE INDEX CONCURRENTLY` to avoid table locks.
4. Verify the migration is idempotent (safe to run twice).
5. Test locally: `pnpm --filter="@udd/database" migrate` against a clean local DB.
6. Full checklist: `docs/runbooks/db-migration-rollout.md`.

**Two-phase drops:** Phase 1 — remove code references, deploy. Phase 2 — write a new migration to drop the column/table, deploy.

---

## Contract changes (`packages/contracts/src/`)

**Safe (backward-compatible):**
- Adding optional fields to response types
- Adding new enum values
- Adding new event topics
- Adding new endpoints

**Breaking (requires migration plan):**
- Removing or renaming fields in response DTOs
- Removing enum values currently stored in the DB
- Removing event topics that active consumers subscribe to
- Removing or renaming endpoints consumed by the iOS companion

**Procedure:**
1. Make the change in `packages/contracts/src/`.
2. Run `pnpm typecheck` — fix all type errors across the monorepo.
3. If removing enum values, check that no DB rows contain that value before deploying.
4. If the iOS companion API surface changes, coordinate with a client release.

---

## Adding a new AI provider

1. Create `packages/adapters/src/model-provider/{provider}.ts` implementing `ModelProviderAdapter`.
2. Register in `packages/adapters/src/model-provider/registry.ts`.
3. Add the new `ProviderType` enum value to `packages/contracts/src/enums.ts`.
4. Write a test in `packages/adapters/src/model-provider/registry.test.ts` covering adapter resolution and exclusivity.
5. No other service changes — the registry routes by `ProviderType`.

---

## Adding a new service

1. Create `apps/{service-name}/src/index.ts` following the existing pattern (Express, SIGTERM/SIGINT handlers).
2. Must use `@udd/config` typed accessors — no `process.env` direct access.
3. Must import `@udd/observability` and expose `/health`, `/ready`, `/alive`.
4. Must register a health check for each dependency (DB, Redis, downstream services).
5. Add to `pnpm-workspace.yaml` and `turbo.json` task graph.
6. Add a Dockerfile following the 3-stage pattern (deps → build → runtime, non-root user, healthcheck).
7. Add to `docker-compose.yml` for local dev.
8. Add to `.github/workflows/build.yml` and `deploy.yml`.

---

## Changing the session state machine

**Only add transitions — never remove.**

Checklist:
- [ ] `packages/contracts/src/enums.ts` SESSION_TRANSITIONS updated
- [ ] `apps/orchestrator/src/services/session.ts` handles the new transition
- [ ] `apps/session-reaper/src/index.ts` handles the new state gracefully (does not get stuck in a poll loop)
- [ ] `apps/collaboration/src/` handles the new state in WebSocket push (if user-visible)
- [ ] Test covers the new transition
- [ ] Verify no in-flight DB sessions are stranded by the change

---

## Changing preview gateway behavior

The gateway is on the critical path for all preview traffic. Any change must:
- Never add caching of route bindings (constraint C10)
- Never allow client-supplied upstream override (constraint C12)
- Preserve the check sequence: auth → route lookup → active → not expired → workspace match → proxy
- Be load tested with `k6/` scripts before production deployment

---

## Changing RBAC

`packages/auth/src/rbac.ts` maps roles to permission sets. Changing this affects all services that call permission-check helpers.

1. Update the role→permission map in `rbac.ts`.
2. Run `packages/auth/src/rbac.test.ts` — it covers the full permission matrix for all 5 roles.
3. Verify that no existing production user would lose a permission they currently rely on, or document the intentional change.

---

## Changing environment variables

1. Update `packages/config/src/index.ts` — add the typed accessor with a safe default if applicable.
2. Update `docs/ENV_CONTRACT.md`.
3. If the variable is required in production, verify it is set in `infra/terraform/` for all environments.
4. Never add a new env var that accepts a plaintext credential — all secrets go through the secret manager.

---

## Before committing

```bash
pnpm typecheck          # Zero TypeScript errors across entire monorepo
pnpm lint               # Zero ESLint violations
pnpm test               # All unit and integration tests pass
pnpm format:check       # Code formatted per .prettierrc
pnpm build              # All packages and services build without error
```

All five must pass. See `docs/quality-gates.md` for the full acceptance checklist.
