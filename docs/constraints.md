# Constraints and Invariants

Hard rules that must not be violated. Each links to its architectural motivation.

---

## Tenancy

**C1. Every DB query that returns workspace-scoped data must filter by `workspace_id`.**
The `workspace_id` must come from the auth JWT context, not from the client request body or URL params alone. Both must match.

**C2. Workspace membership must be verified before any workspace-scoped operation.**
Load the `memberships` row for `(workspace_id, user_id)` from the JWT. A valid JWT alone does not prove current membership.

**C3. Cross-workspace access is never permitted by the application layer.**
There is no admin bypass. Any operation that would return or modify data from workspace A while authenticated to workspace B must be rejected.

*Source: ADR 003, `packages/auth/src/policies.ts`*

---

## Credentials

**C4. No plaintext credentials in the database.**
The `provider_configs.credential_secret_ref` column stores an opaque reference (a GCP Secret Manager resource name) to the external secret manager. The actual credential is never written to any DB table.

**C5. No credentials in logs, traces, audit events, or error messages.**
Any field named `credential`, `apiKey`, `secret`, `password`, or similar must not be logged. This applies to application logs, structured traces, and audit log rows.

**C6. `InMemorySecretManagerProvider` must not be used in production.**
In `apps/ai-orchestration/src/context.ts`, the secret manager is selected by:
```typescript
process.env['NODE_ENV'] === 'production'
  ? new GCPSecretManagerProvider()
  : new InMemorySecretManagerProvider()
```
This selection happens at service startup. If `NODE_ENV` is not set to `'production'` in the production deployment, the service will use the in-memory provider. Verify `NODE_ENV=production` is set in `infra/terraform/` for all production Cloud Run services.

**C7. Only `ai-orchestration` has write access to the external secret manager.**
No other service may write credentials. `api`, `gateway`, and other services have no secret write permissions.

*Source: ADR 006 (revised), `apps/ai-orchestration/src/context.ts`*

---

## AI Provider Calls

**C8. All model invocations must go through `ModelProviderAdapter`.**
No service may import `@anthropic-ai/sdk`, `openai`, `@google-ai/generativelanguage`, or any provider HTTP client directly — except inside `packages/adapters/src/model-provider/`. ESLint rules enforce this.

**C9. Provider credentials must not survive beyond the invocation scope.**
Fetch from secret manager at call time. Pass to adapter method. Do not assign to a module-level variable, cache, or any structure with a lifetime beyond the current request.

*Source: ADR 005*

---

## Preview Gateway

**C10. Gateway must perform a DB-authoritative lookup on every preview request.**
Route bindings must never be cached in memory, Redis, or any intermediate layer. A cached stale binding could route traffic to a reassigned or revoked lease.

**C11. Preview route ID alone never grants access.**
All conditions must pass: authenticated user, workspace membership match, route state `active`, route not expired, worker target IP safety check.

**C12. No arbitrary upstream override in the gateway.**
The proxy target (`worker_host:host_port`) must come exclusively from the `preview_routes` DB record. It must never be derived from user-supplied values.

*Source: ADR 002, `apps/gateway/src/proxy.ts`*

---

## Worker Plane

**C13. Only the gateway tier can route traffic to worker preview ports.**
No other service or direct user connection reaches the worker plane.

**C14. Preview port range on worker hosts is 32100–32109 per host** (as reported by the current stubbed capacity implementation). When the stub is replaced with real OS querying, this range may expand. Any new code that assumes a port range should read from `worker_capacity.available_ports`, not hardcode a range.

**C15. Worker hosts are in a private subnet with no direct inbound internet access.**
New infrastructure must maintain this.

*Source: ADR 001*

---

## Lease Allocation

**C16. Sandbox lease allocation and session state transition must be atomic.**
Both happen in a single serializable DB transaction in the orchestrator (`PgSessionService.startSession`). Never split these into separate transactions.

**C17. Lease allocation uses `FOR UPDATE SKIP LOCKED` on `worker_capacity`.**
This is the mechanism that prevents concurrent startSession calls from double-allocating the same port. Do not change this to `FOR UPDATE` (causes blocking) or remove the lock (causes double-allocation).

---

## Optimistic Concurrency

**C18. `sessions`, `sandbox_leases`, and `preview_routes` use `version`-based optimistic locking.**
All UPDATE statements against these tables must include `WHERE version = $current_version` and increment `version` in the same statement. A concurrent update that does not match the expected version must throw `OptimisticConcurrencyError`. Callers must handle this and retry if appropriate.

---

## Audit

**C19. All mutations must write an audit log entry.**
The audit log is the authoritative record of who changed what and when. Secret values must never appear in any audit log field.

**C20. Audit logs are append-only.**
No UPDATE or DELETE from the application layer.

---

## Database Migrations

**C21. Migrations must be backward-compatible.**
Additive only in a single deploy. Never drop or rename in the same migration that introduces the replacement.

**C22. Two-phase drops.** Phase 1: stop using the column/table in application code, deploy. Phase 2: drop it in a separate migration in a subsequent deploy.

*Source: `docs/runbooks/db-migration-rollout.md`*

---

## iOS Companion API Contract

**C23. The iOS companion API surface must not receive breaking changes without a client-coordinated update.**
Endpoints listed in `docs/contracts.md` (iOS section) must remain backward-compatible.

---

## Common wrong assumptions

- **"I can cache preview route bindings for performance"** — you cannot. See C10.
- **"The JWT workspace membership is always current"** — it was current at issuance. Always verify against DB for mutations. See C2.
- **"Admin service accounts can bypass workspace_id filtering"** — there is no such bypass. See C3.
- **"I can import the Anthropic SDK directly in the api service"** — you cannot. See C8.
- **"The InMemorySecretManagerProvider check lives in packages/config"** — it does not. It is in `apps/ai-orchestration/src/context.ts`. See C6.
- **"The orchestrator calls worker-manager HTTP endpoint to allocate leases"** — it does not. It queries the DB directly. See C16.
- **"Worker hosts report accurate capacity"** — they report hardcoded values. See `docs/runtime.md` host agent section.
