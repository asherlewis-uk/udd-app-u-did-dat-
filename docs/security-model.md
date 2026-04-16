# Security Model

Back to [docs/\_INDEX.md](./_INDEX.md).

## Canonical rules

- Provider credentials are never stored in plaintext in the application database.
- All provider calls go through the provider adapter boundary.
- Commands and previews run only through the runtime boundary, never by letting a client pick arbitrary hosts, ports, or filesystem paths.
- Web and iOS clients are first-class surfaces, but neither gets a privileged bypass around auth, preview, or secret-handling rules.

## Provider credential handling

### Required behavior

1. Persist only a secret reference in product tables.
2. Fetch the secret only at the point of provider use.
3. Pass the credential into the adapter invocation scope only.
4. Drop the credential after the call.
5. Never log, trace, or audit the plaintext credential.

### Current repo behavior

- `apps/ai-orchestration` owns provider config writes and reads.
- Production/hosted uses `GCPSecretManagerProvider` (default when `SECRET_MANAGER_PROVIDER` is unset or `gcp`).
- Development and test use `InMemorySecretManagerProvider` (when `SECRET_MANAGER_PROVIDER=memory`).
- **Selection authority:** `SECRET_MANAGER_PROVIDER` config flag via `config.secrets.provider()`. `NODE_ENV`-based selection has been removed.

## Secret manager rules

- Only the AI orchestration boundary may write provider credentials.
- Other services may use provider metadata, but not provider plaintext.
- Local development may use the in-memory provider only for local and test workflows.
- Production must use the external secret-manager path.

## Shell and command execution boundaries

### Canonical rule

- Hosted commands must execute inside the hosted runtime boundary for a run session.
- Local commands must execute only in explicit local-development workflows.
- API, gateway, auth, and client surfaces must not execute arbitrary user shell commands directly.

### Current repo reality

- The repo has session allocation, preview binding, and host-agent heartbeat plumbing.
- It does not yet expose a complete production-ready command-execution subsystem with verified sandbox isolation. Isolation approach: container-per-session ([ADR 014](./adr/014-container-per-session-isolation.md)). Implementation is open.
- Treat any missing shell/runtime enforcement as an implementation gap, not as implied permission to execute outside the runtime boundary.

## Path restrictions

- Preview targets come only from authoritative runtime data.
- Clients never supply upstream hosts or ports.
- Filesystem access must remain scoped to the project/session boundary in hosted execution and to the local repo checkout in local development.
- Any stack-specific path conventions belong inside stack adapters, not in the shared core.

## Network boundaries

### Hosted mode

- Public traffic terminates at the hosted API or preview gateway.
- Internal runtime services are not public product surfaces.
- Worker targets must stay inside the allowed runtime network range.
- Preview routing must reject loopback, metadata, and arbitrary private-network escape targets.

### Local mode

- Local services may listen on localhost for developer testing.
- Localhost routing is acceptable only in local development.
- Local development configuration must not be copied into production assumptions.

## Preview access rules

- Authentication is required.
- Authorization must be checked against the owning project or its current implementation equivalent.
- Route state and TTL must be enforced on every request.
- Preview authorization is request-time, not cache-authoritative.
- Web and iOS may both surface previews, but neither client can bypass gateway checks.

## Logging and redaction rules

- All logs are structured JSON.
- Correlation IDs must be propagated on inbound and outbound requests.
- Secret-bearing fields must be redacted or omitted.
- Stack traces may be included outside production, but must not contain secrets.
- Audit logs are append-only and must not contain plaintext credentials.

## What must never happen

- Plaintext provider credentials in PostgreSQL.
- Direct provider SDK imports outside the adapter layer.
- Client-controlled preview targets.
- Preview access based only on a preview token without auth and authorization.
- Silent demotion of the hosted web surface in the name of iOS support.
- Silent use of development-only secret handling in production.

## Current implementation notes

- The provider adapter boundary and external secret-manager model are solid and should remain canonical.
- Preview access checks and target filtering exist in the gateway today.
- Hosted runtime isolation is still incomplete. The canonical security model is stricter than current runtime implementation. See [docs/implementation-gaps.md](./implementation-gaps.md).
