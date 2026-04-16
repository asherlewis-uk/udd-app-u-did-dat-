# Domain Model

Back to [docs/\_INDEX.md](./_INDEX.md).

## Canonical Model

The canonical model is solo-first and project-centered.

| Entity                     | Purpose                                                                  | Key relations                                               |
| -------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `user/account`             | The identity that owns and operates projects                             | owns one or more projects and provider configs              |
| `hosted profile`           | Hosted preferences, session defaults, and client settings                | belongs to one user                                         |
| `local dev profile`        | Local-only configuration used during supported local development         | belongs to one user on one machine                          |
| `project`                  | Primary product container for code, runtime state, previews, and AI work | belongs to one user/account in the canonical model          |
| `stack`                    | Detected or chosen technical shape of a project                          | attached to one project                                     |
| `scaffold template`        | Starting point for a new project                                         | chosen for one project                                      |
| `run session`              | Hosted execution instance for a project                                  | belongs to one project                                      |
| `preview session`          | Hosted preview binding for a running session                             | belongs to one run session                                  |
| `provider config`          | Named model-provider configuration                                       | belongs to one user or project scope                        |
| `secret ref`               | Opaque reference to credential material                                  | attached to one provider config                             |
| `artifact/export target`   | Output, snapshot, or deployment handoff target                           | belongs to one project or session                           |
| `index/memory record`      | Project memory and retrieval state                                       | belongs to one project                                      |
| `command execution record` | Structured record of a hosted or local command invocation                | belongs to one project or run session                       |
| `remote host/worker`       | Hosted runtime infrastructure node                                       | optional infrastructure, not a user-facing canonical entity |

## Canonical Relations

- A user owns or directly operates projects.
- A project may have one detected or selected stack at a time, with history kept outside the canonical model if needed.
- A project can have many run sessions and preview sessions over time.
- Provider configs and secret refs are stable boundaries regardless of client surface.
- Web and iOS consume the same project-centered model.

## Current Implementation Reality

ADR 013 Phase 1 and Phase 2 are complete. The product surface is project-first. `workspaceId` is retained as an internal tenancy and shard key only. New tokens use `grantedPermissions` in JWT claims; `workspaceId`/`workspaceRole` are deprecated.

| Current code entity              | Current role                                   | Canonical interpretation                                        |
| -------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- |
| `organizations`                  | top-level DB tenancy container                 | internal implementation detail, not the canonical product center |
| `workspaces`                     | internal tenancy and shard key                 | internal implementation detail, not the canonical product center |
| `projects`                       | primary product entity                         | the canonical project                                           |
| `memberships` and `role_grants`  | workspace-scoped access model (deprecated)     | legacy access model; project access now via workspace membership |
| `grantedPermissions` in JWTs     | primary authorization mechanism in new tokens  | canonical auth model                                            |
| `workspaceId` in DB and internal routes | internal tenancy key                    | retained for sharding; removed from product API surface         |

## Thin-workspace migration strategy

Per [ADR 013](./adr/013-thin-workspace-migration-strategy.md), `workspaceId` remains as an internal shard and tenancy key, but is removed from the product API surface, client UIs, and canonical contracts. Migration is incremental:

1. New API routes are project-first.
2. Existing workspace-shaped routes are deprecated over time.
3. Client UIs present projects as top-level entities.
4. `packages/contracts` evolves to define project-first DTOs.
5. Internal DB columns and auth claims may continue to use `workspaceId` for tenancy without violating the canonical model.

## Modeling Rules

- New canonical docs must define user and project before organization or workspace.
- New product planning must not introduce workspace-owned behavior as the default model without an ADR.
- Web and iOS client planning must use the same canonical domain model.
