# ADR 011: Hosted Preview Is the Default Preview Model

**Status:** Canonical  
**Date:** 2026-04-13  
Back to [docs/_INDEX.md](../_INDEX.md).

## Context

Hosted execution needs a stable preview experience that works cleanly across the hosted web and iOS clients.

## Decision

Hosted preview is the default preview model.

- Preview is exposed through the hosted gateway.
- Preview authorization is enforced server-side on every request.
- Local preview testing is supported, but it is not the canonical product story.

## Consequences

- Product docs and runbooks assume hosted preview first.
- ADR 002 remains the lower-level transport decision for path-based preview routes.
