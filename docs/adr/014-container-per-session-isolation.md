# ADR 014: Container-per-Session Isolation

**Status:** Canonical  
**Date:** 2025-07-14  
**Refines:** [ADR 008 — Hosted Execution Canonical](./008-hosted-execution-canonical.md)  
**Supersedes:** [ADR 004 — MicroVM Isolation](./004-microvm-isolation.md)

Back to [docs/\_INDEX.md](../_INDEX.md).

## Context

ADR 008 establishes that hosted execution is the canonical runtime mode. It requires strong per-session isolation but does not prescribe the isolation technology.

ADR 004 proposed MicroVM-per-session isolation, but no MicroVM provisioning has been implemented. The repo's runtime plumbing (session allocation, host-agent heartbeat, worker-manager capacity) was designed around a container-compatible model.

## Decision

**The chosen implementation approach for per-session isolation is container-per-session on a managed container platform.**

Specifically:

1. **One container per run session.** Each session gets its own container with an isolated filesystem, network namespace, and process tree.
2. **Managed container platform.** The hosting platform provides container orchestration. This ADR does not prescribe a specific vendor or product (e.g., Cloud Run, ECS, Kubernetes). The platform must support on-demand container creation with sub-minute cold start.
3. **No MicroVM requirement.** MicroVM isolation is not required at this time. If a future threat model demands stronger isolation, a new ADR may reintroduce it.
4. **Session lifecycle unchanged.** The existing lifecycle (`creating -> starting -> running -> idle -> stopping -> stopped`) remains. The orchestrator allocates containers instead of MicroVM slots.
5. **Host-agent adapts.** Host-agent reports container-level capacity rather than MicroVM-level capacity. Heartbeat and capacity reporting contracts remain the same.
6. **Preview binding unchanged.** Gateway preview routes bind to container targets using the same preview contract.

## Consequences

- Runtime isolation becomes achievable with existing container infrastructure.
- The gap between canonical runtime docs and actual implementation narrows significantly.
- Session reaper, worker-manager, and host-agent implementations need updates to target containers, but their contracts and roles stay stable.
- Preview stability improves because preview routes bind to real isolated targets.
- If stronger-than-container isolation is needed later, a follow-up ADR can layer MicroVM or sandbox runtimes on top.
