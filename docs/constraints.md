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
The `provider_configs.credential_secret_ref` column stores an opaque reference (ARN or key) to the external secret manager. The actual credential is never written to any DB table.

**C5. No credentials in logs, traces, audit events, or error messages.**
Any field named `credential`, `apiKey`, `secret`, `password`, or similar must not be logged. This applies to application logs, structured traces, and audit log rows.

**C6. `InMemorySecretManagerProvider` must not be used in staging or production.**
`SECRET_MANAGER_PROVIDER=memory` is only valid when `NODE_ENV=development` or `NODE_ENV=test`. `packages/config` must enforce this at startup.

**C7. Only `ai-orchestration` has write access to the external secret manager.**
No other service may write credentials. `api`, `gateway`, and other services have no secret write permissions.

*Source: ADR 006, `packages/adapters/src/secret-manager.ts`*

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
All four conditions must pass: authenticated user, workspace membership match, route state `active`, route not expired.

**C12. No arbitrary upstream override in the gateway.**
The proxy target (`worker_host:host_port`) must come exclusively from the `preview_routes` DB record. It must never be derived from user-supplied values.

*Source: ADR 002, `apps/gateway/src/registry.ts`*

---

## Worker Plane

**C13. Only the gateway tier can route traffic to worker preview ports.**
No other service or direct user connection reaches the worker plane. Sandbox breakout cannot reach control plane services.

**C14. Preview port range 32000–33000 is exclusively for sandbox preview ports.**
No other service or process may use this range on worker hosts.

**C15. Worker hosts are in a private subnet with no direct inbound internet access.**
New infrastructure must maintain this. No security group rule may open worker hosts to the internet.

*Source: ADR 001*

---

## Optimistic Concurrency

**C16. `sessions`, `sandbox_leases`, and `preview_routes` use `version`-based optimistic locking.**
All UPDATE statements against these tables must include `WHERE version = $current_version` and increment `version` in the same statement. A concurrent update that does not match the expected version must throw `OptimisticConcurrencyError`. Callers must handle this and retry if appropriate.

---

## Audit

**C17. All mutations must write an audit log entry.**
The audit log is the authoritative record of who changed what and when. Secret values must not appear in any audit log field.

**C18. Audit logs are append-only.**
No UPDATE or DELETE from the application layer. Any tooling that modifies audit log rows is a security violation.

---

## Database Migrations

**C19. Migrations must be backward-compatible.**
The new schema must work correctly with both the previous and current application versions simultaneously. One deploy = one forward-only schema change. Never drop or rename in the same migration that introduces the replacement.

**C20. Two-phase drops.** Phase 1: stop using the column/table in the application code. Phase 2: drop it in a separate migration in a subsequent deploy.

*Source: `docs/runbooks/db-migration-rollout.md`*

---

## iOS Companion API Contract

**C21. The iOS companion API surface must not receive breaking changes without a client-coordinated update.**
Endpoints consumed by the iOS app (see `docs/contracts.md` iOS section) must remain backward-compatible. Removing or renaming fields in their responses requires a versioning strategy.

---

## Common wrong assumptions

- **"I can cache preview route bindings for performance"** — you cannot. See C10.
- **"The JWT workspace membership is always current"** — it was current at issuance. Membership changes require re-auth. Always verify against DB for mutations. See C2.
- **"Admin service accounts can bypass workspace_id filtering"** — there is no such bypass. See C3.
- **"I can import the Anthropic SDK directly in the api service"** — you cannot. See C8.
- **"I can log the full request body for debugging"** — only if you are certain no credentials are in it. See C5.
