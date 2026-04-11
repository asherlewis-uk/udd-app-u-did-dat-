# ADR 003: Workspace-Owned Tenancy Model

**Status**: Accepted  
**Date**: 2026-04-11

## Context

The platform serves multiple organizations. We need a tenancy model that:
- Isolates data between organizations
- Allows sharing within an organization
- Supports per-project access controls

## Decision

Three-level hierarchy: **Organization → Workspace → Project**

- An `Organization` is the billing entity (WorkOS org).
- A `Workspace` is the primary collaboration unit. Users are members of workspaces, not organizations directly.
- A `Project` belongs to a workspace. Sessions, previews, comments, and pipeline runs are scoped to projects.
- All RBAC is workspace-scoped. Permissions are granted at the workspace level with optional project-level refinement.
- Every DB row carries a `workspace_id` column that is indexed and used in all access checks.

**Row-level security**: Enforced in application layer (not PostgreSQL RLS) for now. Every repository method filters by `workspace_id`.

## Consequences

- `workspace_id` must be verified on every data access — it is the tenancy boundary.
- Cross-workspace data access is never permitted by the application layer.
- Workspace membership must be loaded and verified before any workspace-scoped operation.
- Future: PostgreSQL RLS can be added as defense in depth without application changes.
