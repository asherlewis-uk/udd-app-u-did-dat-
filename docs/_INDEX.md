# UDD Platform — Documentation Index

This is the authoritative documentation system for the UDD Platform monorepo.
When in doubt about what is true, read the source code. When in doubt about what to do, start here.

## Authoritative Documents

| Document | When to read it |
|----------|----------------|
| [overview.md](overview.md) | First read — what the system is, phase status, what is implemented vs stubbed vs planned |
| [architecture.md](architecture.md) | Service map, package map, control/worker plane split, DB ownership |
| [runtime.md](runtime.md) | How sessions, workers, previews, and pipelines actually behave at runtime |
| [flows.md](flows.md) | End-to-end traces of auth, session creation, preview access, pipeline runs |
| [repo-map.md](repo-map.md) | Where things live, what they own, dependency rules |
| [constraints.md](constraints.md) | Hard invariants — read before touching tenancy, credentials, preview, or worker plane |
| [contracts.md](contracts.md) | Shared types, state transitions, event topics, inter-service API surface |
| [change-protocol.md](change-protocol.md) | How to safely make changes: schema, contracts, state machines, new services |
| [quality-gates.md](quality-gates.md) | What must pass before work is considered complete |
| [priority-map.md](priority-map.md) | High-value gaps, unstable areas, Phase 3 scope boundary |
| [ENV_CONTRACT.md](ENV_CONTRACT.md) | Canonical environment variable reference for all services |
| [LOCAL_DEV.md](LOCAL_DEV.md) | Local development setup |

## Architecture Decision Records

All six ADRs are accepted and current.

| ADR | Decision |
|-----|----------|
| [ADR 001](adr/001-split-control-worker-plane.md) | Control plane / worker plane network split |
| [ADR 002](adr/002-port-mapped-preview-proxy.md) | Path-based preview proxy (`/preview/{id}/...`) |
| [ADR 003](adr/003-workspace-tenancy.md) | Three-level tenancy: Org → Workspace → Project |
| [ADR 004](adr/004-microvm-isolation.md) | MicroVM-per-session isolation, port range 32000–33000 |
| [ADR 005](adr/005-model-provider-adapter-boundary.md) | ModelProviderAdapter boundary — no direct provider SDK usage outside adapters package |
| [ADR 006](adr/006-external-secret-manager.md) | External secret manager — no plaintext credentials in DB |

## Operational Runbooks

| Runbook | Trigger |
|---------|---------|
| [worker-failure.md](runbooks/worker-failure.md) | Worker host missed heartbeats; sessions/previews stranded on dead host |
| [stale-preview-lease.md](runbooks/stale-preview-lease.md) | Preview URL returning 410 for a session that is still running |
| [secret-rotation.md](runbooks/secret-rotation.md) | Rotating or emergency-revoking AI provider credentials |
| [stuck-pipeline-run.md](runbooks/stuck-pipeline-run.md) | Pipeline run stuck in `preparing` or `running` state |
| [db-migration-rollout.md](runbooks/db-migration-rollout.md) | Deploying schema migrations safely |

## Archive

`docs/archive/` contains non-authoritative historical material.
Do not use archived content to guide implementation.
See [`archive/_ARCHIVE_NOTICE.md`](archive/_ARCHIVE_NOTICE.md) for the exclusion rule.
