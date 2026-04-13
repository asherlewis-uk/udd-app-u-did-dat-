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
| Current code | No first-class registry yet; decision made: static config-driven registry. See [docs/implementation-gaps.md](./implementation-gaps.md). |

## Scaffold contract

| Item         | Contract                                                                                                                                    |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Purpose      | Create new projects from an idea, template, or selected stack                                                                               |
| Inputs       | Idea, template ID, stack choice, project metadata                                                                                           |
| Outputs      | Project skeleton, stack metadata, initial files, next recommended run path                                                                  |
| Errors       | Unknown template, unsupported stack, invalid scaffold parameters                                                                            |
| Current code | No first-class scaffold engine yet; decision made: built-in bundled templates. See [docs/implementation-gaps.md](./implementation-gaps.md). |

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

| Item         | Contract                                                                     |
| ------------ | ---------------------------------------------------------------------------- |
| Purpose      | Store and fetch secret values without persisting plaintext in product tables |
| Inputs       | Secret write request, secret ref lookup, rotation request                    |
| Outputs      | Secret ref, fetched secret value at call time, rotation result               |
| Errors       | Not found, permission denied, provider unavailable, invalid ref              |
| Current code | `GCPSecretManagerProvider`, `InMemorySecretManagerProvider`                  |

## Export and deploy adapter contract

| Item         | Contract                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| Purpose      | Hand artifacts or repos off to external git, storage, or deployment targets                            |
| Inputs       | Artifact metadata, repo metadata, destination target, auth context                                     |
| Outputs      | Export record, external reference, adapter result                                                      |
| Errors       | Unsupported target, auth failure, external provider failure                                            |
| Current code | Partial via git, storage, billing, and notification adapters; not a first-class deploy product surface |

## Error envelope rules

- Client-facing errors must expose a stable code and a human-usable message.
- Internal errors may carry correlation IDs and safe metadata.
- Secret-bearing payloads must never be included in an error body.
- Web and iOS contract changes must remain backward-compatible unless an explicit ADR says otherwise.

## Current implementation notes

- `packages/contracts` remains the code-level contract base for entities, DTOs, events, and enums.
- The current external API still reflects workspace ownership and workspace-scoped routes. Migration to project-first routes follows [ADR 013](./adr/013-thin-workspace-migration-strategy.md).
- Web and iOS must consume the same project-centered contracts. Shared contracts plus iOS conformance tests enforce parity.
- The canonical contract set in this file is stricter and more stable than the current route layout. See [docs/implementation-gaps.md](./implementation-gaps.md).
