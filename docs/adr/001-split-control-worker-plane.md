# ADR 001: Split Control Plane and Runtime Plane

**Status:** Canonical  
**Date:** 2026-04-11  
Back to [docs/_INDEX.md](../_INDEX.md).

## Context

The product is hosted-first. Hosted runtime execution must stay isolated from the public control surfaces used by web and iOS clients. A flat network where runtime targets and public APIs share the same trust boundary is not acceptable for the hosted product.

## Decision

Keep a split between:

- **Control plane**: public and internal product services such as API, gateway, orchestration, auth-facing services, and AI orchestration.
- **Runtime plane**: the runtime hosts and runtime-facing infrastructure used to execute user work.

The preview gateway is the controlled ingress from product clients into hosted runtime previews.

## Consequences

- Hosted preview traffic remains a gateway concern, not a direct runtime-host concern.
- Runtime hosts stay out of the public product surface.
- Web and iOS both benefit from a cleaner hosted trust boundary.
- This ADR stays canonical for the hosted-first architecture.
