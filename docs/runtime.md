# Runtime

Back to [docs/\_INDEX.md](./_INDEX.md).

## Canonical runtime truth

Hosted runtime is the default runtime model for the product. Local runtime exists for development and operator validation. Runtime docs must describe both, but hosted mode sets the default mental model.

## Command execution model

### Canonical rule

- Hosted commands run through the hosted runtime boundary attached to a run session.
- Local commands run only in explicit developer workflows.
- The API layer, preview gateway, and client surfaces must not execute arbitrary shell commands directly.

### Current repo reality

- Session allocation, lease tracking, and preview binding exist.
- The repo does not yet implement a fully verified hosted command-execution and sandbox boot path.
- Treat missing hosted command execution details as an implementation gap, not as permission to bypass the runtime boundary.
- **Decision:** Hosted command execution is core. Channel design (how commands are submitted and streamed) is deferred until container-per-session isolation ([ADR 014](./adr/014-container-per-session-isolation.md)) is implemented.

## Hosted process lifecycle

### Session lifecycle

`creating -> starting -> running -> idle -> stopping -> stopped`

`failed` is terminal and may be reached from intermediate states.

### Runtime actors

| Component             | Runtime role                                                                                                               |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `apps/orchestrator`   | Owns session transitions and lease allocation                                                                              |
| `apps/worker-manager` | Stores runtime capacity snapshots                                                                                          |
| `apps/host-agent`     | Registers and heartbeats runtime hosts                                                                                     |
| `apps/session-reaper` | Cleans up idle sessions and orphaned leases (canonical model: scheduled single-invocation job, not a long-running service) |
| `apps/gateway`        | Exposes previews for active runtime targets                                                                                |

## Preview lifecycle

1. Preview is requested for a session.
2. Preview route is created and stored.
3. Gateway validates the preview on every request.
4. Preview expires, is revoked, or becomes unavailable when the session stops or the route times out.

## Ports

### Current code defaults

| Component               | Default port                                |
| ----------------------- | ------------------------------------------- |
| `apps/api`              | `8080`                                      |
| `apps/gateway`          | `3000`                                      |
| `apps/orchestrator`     | `3002`                                      |
| `apps/collaboration`    | `3003`                                      |
| `apps/ai-orchestration` | `3004`                                      |
| `apps/worker-manager`   | `3005`                                      |
| `apps/web`              | `3007`                                      |
| `apps/usage-meter`      | `3006`                                      |

### Runtime consequence

- All services have unique default ports; no collisions exist in local all-services startup.
- Hosted infrastructure may override ports through deployment config.
- Docs must reflect both the code defaults and the operational need to override them locally.

## Logs

- All services log JSON to stdout.
- Correlation IDs must follow requests across API, gateway, orchestrator, and AI orchestration.
- Runtime failures must be diagnosable from structured logs without exposing secrets.

## Timeouts and intervals

| Setting                       | Current source                        | Default                                              |
| ----------------------------- | ------------------------------------- | ---------------------------------------------------- |
| Session reaper idle threshold | raw env `IDLE_THRESHOLD_SECONDS`      | `1800` seconds                                       |
| Session reaper scan interval  | raw env `SCAN_INTERVAL_MS`            | `60000` ms (becomes no-op under scheduled-job model) |
| Host heartbeat interval       | `config.worker.heartbeatIntervalMs()` | `30000` ms                                           |
| Pipeline stuck timeout        | `config.worker.stuckRunTimeoutMs()`   | `300000` ms                                          |
| Sandbox lease TTL             | raw env `SANDBOX_LEASE_TTL_SECONDS`   | `86400` seconds                                      |
| Preview default TTL           | `config.preview.ttlSeconds()`         | `3600` seconds                                       |

## Sandboxing and isolation

### Canonical rule

- Hosted runtime must provide strong per-session isolation.
- Local development mode runs with local machine trust and is not an isolation substitute.

### Decided approach

- **Container-per-session** on a managed container platform. See [ADR 014](./adr/014-container-per-session-isolation.md).
- Each session gets its own container with an isolated filesystem, network namespace, and process tree.
- MicroVM isolation is not required at this time ([ADR 004](./adr/004-microvm-isolation.md) is superseded).
- If a future threat model demands stronger isolation, a follow-up ADR may reintroduce MicroVM or sandbox runtimes.

### Current repo reality

- Host-agent heartbeats and capacity ingestion exist.
- Capacity reporting is real: host-agent reports OS-level CPU, memory, and port availability (`os.cpus`, `os.freemem`, port probing). Slot allocation and release are in-memory set operations.
- Container-per-session isolation is not yet implemented.
- Worker target safety checks in the gateway are real and valuable, but they do not replace runtime isolation.

## Hosted vs local runtime

### Hosted

- Canonical product path.
- Requires API, gateway, orchestrator, runtime support services, database, and preview routing.

### Local

- Supported for development and validation.
- Requires explicit service startup and port management.
- Can validate a subset of hosted behavior, but not full production isolation.

## Current implementation notes

- The repo is hosted-runtime oriented, not local-first.
- Runtime isolation approach: container-per-session ([ADR 014](./adr/014-container-per-session-isolation.md)). Implementation open.
- Session reaper canonical model: scheduled single-invocation job. Code has been refactored to single-cycle-and-exit mode.
- Runtime safety and hosted topology are only partially complete. See [docs/implementation-gaps.md](./implementation-gaps.md).
- Workflow files and Terraform still disagree with some runtime service shapes. That drift is documented, not fixed, in this pass.
