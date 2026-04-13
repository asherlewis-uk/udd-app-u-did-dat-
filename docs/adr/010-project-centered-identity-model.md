# ADR 010: Canonical Identity and Project Model Is Project-Centered

**Status:** Canonical  
**Date:** 2026-04-13  
Back to [docs/_INDEX.md](../_INDEX.md).

## Context

The current codebase is workspace-shaped, but the product needs a simpler solo-first canonical model.

## Decision

Canonical product docs center on:

- account or user
- hosted profile
- local development profile
- project
- run session
- preview session

Organization and workspace remain current implementation facts, not the canonical product model.

## Consequences

- Product docs no longer treat workspace RBAC as the product center.
- Existing workspace-shaped code is tracked as implementation drift until code changes.
- This ADR helps supersede ADR 003.
