# Contracts

Back to [docs/\_INDEX.md](./_INDEX.md).

## Contract scope

This file defines the stable internal boundaries the rest of the docs rely on. Web and iOS are the first-class client consumers of these boundaries. Current HTTP routes and database tables still expose workspace-shaped implementation details, but those details do not redefine the canonical contracts below.

## Common rules

- Every contract must expose explicit inputs, outputs, and error cases.
- Provider credentials never cross a boundary as durable plaintext.
- Stack-specific behavior belongs behind stack or scaffold boundaries, not in generic client or API contracts.
- When code still uses workspace-shaped DTOs, treat that as current implementation reality and record drift in [docs/implementation-gaps.md](./implementation-gaps.md).

## AI orchestration contract

| Item         | Contract                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Execute provider-backed AI work, pipeline runs, and future agent-driven edit flows                                     |
| Inputs       | Provider config ref, model/provider type, structured request payload, run metadata, correlation ID                     |
| Outputs      | Run status, model response, invocation metadata, audit-safe logs                                                       |
| Errors       | Invalid provider config, secret lookup failure, unsupported provider, provider failure, rate limit, validation failure |
| Current code | `apps/ai-orchestration`, `packages/adapters`                                                                           |

## Stack adapter contract

| Item         | Contract                                                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Normalize stack detection, run behavior, preview expectations, and future stack-aware edits                                             |
| Inputs       | Project files, explicit stack hint, run or build intent                                                                                 |
| Outputs      | Detected stack, commands, preview defaults, adapter-specific capabilities                                                               |
| Errors       | Unknown stack, ambiguous stack, unsupported stack, invalid adapter output                                                               |
| Current code | Implemented at `packages/stack-registry/` with 10 stacks and `getStack`/`getAllStacks`/`detectStack` APIs. |

## Scaffold contract

| Item         | Contract                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Create new projects from an idea, template, or selected stack                                                                               |
| Inputs       | Idea, template ID, stack choice, project metadata                                                                                           |
| Outputs      | Project skeleton, stack metadata, initial files, next recommended run path                                                                  |
| Errors       | Unknown template, unsupported stack, invalid scaffold parameters                                                                            |
| Current code | Implemented at `packages/scaffold/` with 4 built-in bundled templates and `scaffold`/`getTemplate`/`getAllTemplates` APIs. |

## Runtime contract

| Item         | Contract                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------- |
| Purpose      | Create, start, stop, and observe hosted run sessions                                         |
| Inputs       | Project identity, user identity, desired runtime parameters, correlation ID                  |
| Outputs      | Run session record, state transitions, runtime target, lifecycle events                      |
| Errors       | Invalid project, no capacity, invalid transition, concurrency conflict, runtime boot failure |
| Current code | `apps/orchestrator`, `apps/worker-manager`, `apps/host-agent`, `apps/session-reaper`         |

## Preview contract

| Item         | Contract                                                                               |
| ------------ | -------------------------------------------------------------------------------------- |
| Purpose      | Expose a running session through a stable preview surface                              |
| Inputs       | Session ID, auth context, preview TTL or policy                                        |
| Outputs      | Preview binding, preview URL, preview state                                            |
| Errors       | Session not runnable, binding failure, expired or revoked preview, unauthorized access |
| Current code | `apps/gateway`, preview repositories, web and iOS preview consumers                    |

## Model provider contract

| Item         | Contract                                                                                                  |
| ------------ | --------------------------------------------------------------------------------------------------------- |
| Purpose      | Standardize model invocation across Anthropic, OpenAI, Google, compatible endpoints, and future providers |
| Inputs       | Normalized invocation request, model settings, fetched credential                                         |
| Outputs      | Normalized response, usage metadata, safe error surface                                                   |
| Errors       | Unsupported provider, invalid credential, provider outage, malformed response                             |
| Current code | `packages/adapters/src/model-provider/*`                                                                  |

## Secret manager contract

| Item         | Contract                                                                                                                                                                                          |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Store and fetch secret values without persisting plaintext in product tables                                                                                                                      |
| Inputs       | Secret write request, secret ref lookup, rotation request                                                                                                                                         |
| Outputs      | Secret ref, fetched secret value at call time, rotation result                                                                                                                                    |
| Errors       | Not found, permission denied, provider unavailable, invalid ref                                                                                                                                   |
| Current code | `GCPSecretManagerProvider` (production/hosted), `InMemorySecretManagerProvider` (dev/test). Selection authority: `SECRET_MANAGER_PROVIDER` config flag. See [ENV_CONTRACT.md](./ENV_CONTRACT.md). |

## Export and deploy adapter contract

| Item         | Contract                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| Purpose      | Hand artifacts or repos off to external git, storage, or deployment targets                            |
| Inputs       | Artifact metadata, repo metadata, destination target, auth context                                     |
| Outputs      | Export record, external reference, adapter result                                                      |
| Errors       | Unsupported target, auth failure, external provider failure                                            |
| Current code | Partial via git, storage, billing, and notification adapters; not a first-class deploy product surface |

## AI retrieval contract (Hybrid Retrieval Boundary)

| Item         | Contract                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Provide AI workflows with accurate, verified project context via a hybrid semantic + structural retrieval boundary     |
| Approach     | **Semantic RAG** for concept discovery and natural language queries, **GitNexus Graph** for structural verification, symbol tracing, and blast-radius analysis ([ADR 015](./adr/015-canonical-hosted-baseline-and-middleware.md)) |
| Inputs       | Natural language query, project identity, retrieval scope, optional symbol filter                                       |
| Outputs      | Ranked context chunks verified against GitNexus ground truth, source locations, confidence scores                      |
| Errors       | No index available, stale index, no relevant results, graph verification failure                                       |
| Current code | No dedicated subsystem yet. Canonical boundary defined; implementation incomplete. See [docs/implementation-gaps.md](./implementation-gaps.md). |

## Realtime middleware contract (Pusher)

| Item         | Contract                                                                                                               |
| ------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Provide managed real-time state synchronization, presence, and event fan-out for web and iOS surfaces                  |
| Inputs       | Channel name, event type, payload, auth context                                                                        |
| Outputs      | Real-time event delivery to subscribed clients, presence state                                                         |
| Errors       | Auth failure, channel limit exceeded, Pusher service unavailable                                                       |
| Current code | `apps/collaboration` (pending refactor to Pusher SDK per [ADR 015](./adr/015-canonical-hosted-baseline-and-middleware.md)) |

## Error envelope rules

- Client-facing errors must expose a stable code and a human-usable message.
- Internal errors may carry correlation IDs and safe metadata.
- Secret-bearing payloads must never be included in an error body.
- Web and iOS contract changes must remain backward-compatible unless an explicit ADR says otherwise.

## Current implementation notes

- `packages/contracts` remains the code-level contract base for entities, DTOs, events, and enums.
- ADR 013 Phase 2 is complete. Project-first routes are active; workspace-scoped routes are deprecated. `workspaceId` remains as an internal tenancy key only. New tokens use `grantedPermissions` in JWT claims.
- Web and iOS must consume the same project-centered contracts. Shared contracts plus iOS conformance tests enforce parity.
- The canonical contract set in this file is stricter and more stable than the current route layout. See [docs/implementation-gaps.md](./implementation-gaps.md).
