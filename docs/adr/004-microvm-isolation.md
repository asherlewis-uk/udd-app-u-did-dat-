# ADR 004: MicroVM-per-Session Isolation

**Status**: Accepted  
**Date**: 2026-04-11

## Context

User sandboxes run arbitrary code. Container-only isolation (namespace/cgroup) has a larger attack surface than VM-level isolation. We need strong isolation between sessions from different users sharing a worker host.

## Decision

Each workspace session runs in its own MicroVM (e.g., Firecracker or similar). Characteristics:

- One VM per active session (not per project — projects share a session at a time).
- VMs are allocated from a pool on the worker host. The host agent reports available capacity to the worker manager.
- VM state can be checkpointed to object storage and resumed (basis for the checkpoint/restore feature).
- VM network access is limited to: internet (for package installs, API calls) and the preview proxy port range.

**Port allocation**: Each VM is assigned one or more ports in the range 32000–33000 on its host. These ports are what the preview gateway proxies to.

## Consequences

- Cold start latency is higher than container-only. Mitigation: warm pool of pre-initialized VMs on each host.
- Host agent is responsible for tracking VM lifecycle and port allocation.
- Orchestrator treats the host:port pair as the proxy target — it does not need to know VM implementation details.
- Checkpoint/restore requires object storage integration for VM snapshots.
