# Quality Gates

Work is not complete until all applicable gates pass. The CI pipeline enforces the automated checks; the manual checklist items are the responsibility of the author.

---

## Automated gates (must be green before merge)

```bash
pnpm typecheck     # Zero TypeScript errors across all packages and apps
pnpm lint          # Zero ESLint violations
pnpm test          # All unit and integration tests pass
pnpm format:check  # All files match .prettierrc formatting
pnpm build         # All packages and services compile and build successfully
```

These run automatically on every PR via `.github/workflows/`. They must also pass locally before requesting review.

---

## Schema migration checklist

For any PR that includes a new migration file:

- [ ] Migration file named with the next sequential prefix in `packages/database/src/migrations/`
- [ ] Migration is idempotent (safe to run twice without error)
- [ ] All new columns are nullable or have safe defaults
- [ ] All new indexes use `CREATE INDEX CONCURRENTLY`
- [ ] Migration has been run locally against a clean dev DB without errors
- [ ] `SELECT * FROM schema_migrations` shows the new version applied
- [ ] Rollback plan documented (either: redeploy old app version, or: next-migration rollback file)
- [ ] No DROP or RENAME in the same migration as the replacement feature

---

## Contract checklist

For any PR that modifies `packages/contracts/src/`:

- [ ] `pnpm typecheck` passes with zero errors (confirms all consumers compile)
- [ ] No existing response fields removed or renamed without a migration plan
- [ ] New event topics have a publisher call in the emitting service and at least a noop consumer registration
- [ ] iOS companion API surface is unchanged, or the change is additive and non-breaking
- [ ] State transition tables (`SESSION_TRANSITIONS`, `PIPELINE_RUN_TRANSITIONS`) only have transitions added, none removed

---

## Security checklist

For any PR that touches data access, credentials, or the preview/worker path:

- [ ] No plaintext credentials appear in new code: no new DB columns storing credentials, no logging of credential-bearing objects
- [ ] Any new AI provider interaction goes through `ModelProviderAdapter`, not a direct SDK import
- [ ] Any new endpoint returning workspace-scoped data filters by `workspace_id` from JWT context (not from client-supplied body)
- [ ] Any new endpoint modifying session, sandbox_lease, or preview_route state uses `WHERE version = $n` optimistic locking
- [ ] `InMemorySecretManagerProvider` is only reachable when `NODE_ENV=development` or `NODE_ENV=test`
- [ ] No new gateway-side caching of preview route bindings

---

## Architecture checklist

For any PR that adds a new service, endpoint, or inter-service dependency:

- [ ] New service-to-service calls use env-var-configured base URLs, not hardcoded hostnames
- [ ] No new service imports provider SDKs outside `packages/adapters/src/model-provider/`
- [ ] New service exposes `/health`, `/ready`, `/alive` via `@udd/observability`
- [ ] New service uses `@udd/config` for all env vars (no raw `process.env` access)
- [ ] Worker plane remains unreachable except via gateway

---

## Environment variable checklist

For any PR that introduces new configuration:

- [ ] New env var added to `packages/config/src/index.ts` with type and safe default
- [ ] `docs/ENV_CONTRACT.md` updated with the new variable and description
- [ ] Variable is set in `infra/terraform/` for all target environments (dev, staging, prod)
- [ ] No new env var accepts a plaintext credential (all secrets via secret manager)

---

## Test coverage expectations

- New repository methods: unit test with real query shape (or integration test against test DB)
- New state transitions: test the transition path in `apps/orchestrator` and the rejection of invalid transitions
- New adapter implementations: test via `packages/adapters/src/model-provider/registry.test.ts` pattern
- New gateway auth/check logic: test via the deny/allow test pattern in `apps/gateway/src/proxy.test.ts`
- New DAG validation rules: test in `apps/ai-orchestration/src/dag-validator.test.ts`

There is no enforced coverage percentage. The expectation is that critical paths (auth checks, state machine transitions, proxy authorization, adapter resolution) have explicit test coverage.
