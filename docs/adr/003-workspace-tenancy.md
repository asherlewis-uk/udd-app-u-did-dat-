# ADR 003: Workspace-Owned Tenancy Model

**Status:** Superseded  
**Date:** 2026-04-11  
**Superseded by:** [ADR 007](./007-solo-first-hosted-first-product-model.md), [ADR 010](./010-project-centered-identity-model.md)  
Back to [docs/_INDEX.md](../_INDEX.md).

## Context

This ADR captured the original workspace-centered implementation model:

`Organization -> Workspace -> Project`

That model still exists in the current codebase and database.

## Historical decision

The old decision made workspace membership and workspace-scoped RBAC the primary tenancy boundary.

## Current status

This ADR is historical only. It remains useful for understanding current implementation reality, but it is no longer the canonical product model.

Canonical product docs are now solo-first and project-centered. Any continued workspace dependency belongs in [docs/implementation-gaps.md](../implementation-gaps.md), not in current product scope.
