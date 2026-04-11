# ADR 001: Split Control Plane / Worker Plane

**Status**: Accepted  
**Date**: 2026-04-11

## Context

The platform needs to run user code in isolated sandboxes. User sandboxes must not be able to influence the platform control services or access other users' data. Naive co-location of control services and worker sandboxes on the same network segment creates lateral movement risk.

## Decision

Separate all infrastructure into two planes:

**Control plane**: API gateway, orchestrator, collaboration, AI orchestration, worker manager. Reachable from the internet via ALB. Connected to the database and Redis.

**Worker plane**: Worker hosts running user sandboxes. Private subnet only — no direct internet access. Not reachable from the internet. Only the preview gateway (which runs in the control plane) can reach worker preview ports.

## Consequences

- Sandbox breakout cannot directly reach control plane services.
- Preview gateway is the only path from users to worker preview ports and must enforce authorization on every request.
- Worker hosts register with the worker manager via an internal control channel.
- Inter-plane traffic must go through the gateway tier, enabling mTLS enforcement in Phase 2.
- Additional networking complexity versus a flat network, but necessary for multi-tenant security.
