# ADR 013: Thin-Workspace Migration Strategy

**Status:** Canonical  
**Date:** 2025-07-14  
**Builds on:** [ADR 010 — Project-Centered Identity Model](./010-project-centered-identity-model.md)  
**Supersedes:** [ADR 003 — Workspace Tenancy](./003-workspace-tenancy.md) (already superseded by ADR 007 and 010; this ADR completes the replacement)

Back to [docs/\_INDEX.md](../_INDEX.md).

## Context

ADR 010 established that the canonical product model is project-centered. The current codebase still routes through `Organization -> Workspace -> Project` in schema, auth claims, API routes, and client code.

A full removal of `workspaceId` would require a coordinated migration across database schema, JWT claims, API routes, web UI, and iOS client — all at once. That is high risk and unnecessary.

## Decision

**`workspaceId` remains as an internal shard/tenancy key but is removed from the product API surface, client UIs, and canonical contracts.**

Specifically:

1. **Database:** `workspace_id` columns stay. They serve as internal tenancy and shard keys.
2. **Auth claims:** JWTs may continue to carry `workspaceId` internally, but public API responses and client-facing token payloads migrate to project-scoped identifiers.
3. **API routes:** New routes are project-first (`/projects/:projectId/...`). Existing workspace-shaped routes are deprecated and eventually removed. No new workspace-first routes are created.
4. **Client UIs:** Web and iOS surfaces present projects as top-level entities. Workspace concepts are not exposed to users.
5. **Canonical contracts:** `packages/contracts` evolves to define project-first DTOs. Workspace-shaped DTOs are marked deprecated.

## Consequences

- Migration is incremental and reversible at each step.
- Existing data does not require a big-bang schema rewrite.
- Internal code may continue to reference `workspaceId` for tenancy purposes without violating this ADR.
- The product surface becomes project-centered as defined in [docs/domain-model.md](../domain-model.md).
- Any code change that introduces new workspace-first product semantics requires a new ADR to justify reversal.
