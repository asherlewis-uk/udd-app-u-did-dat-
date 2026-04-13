# ADR 012: Web and iOS Are First-Class Client Surfaces

**Status:** Canonical  
**Date:** 2026-04-13  
Back to [docs/_INDEX.md](../_INDEX.md).

## Context

The product needs an explicit client-surface rule so iOS becomes first-class without quietly demoting the hosted web product.

## Decision

Treat both web and iOS as first-class product surfaces.

- Web remains the primary hosted surface.
- iOS is non-negotiable and first-class.
- No change may demote or reframe the hosted web surface without an explicit ADR.

## Consequences

- Client-facing contract changes must consider both web and iOS.
- Product scope, architecture, planning, and quality gates must enforce this rule.
