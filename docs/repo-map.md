# Repo Map

Back to [docs/_INDEX.md](./_INDEX.md).

## Top-level folders

| Path | What it holds | Source of truth? |
|---|---|---|
| `apps/` | Hosted services and client apps | Runtime and client implementation |
| `packages/` | Shared contracts, auth, config, database, adapters, observability | Shared implementation source |
| `docs/` | Canonical docs, ADRs, runbooks, archive | Documentation source of truth |
| `infra/terraform/` | Hosted infrastructure definitions | Infra implementation source |
| `.github/workflows/` | CI and deployment automation | Not authoritative for architecture; drift tracked in docs |

## Canonical source-of-truth files

- `AGENTS.md` for root agent instructions
- `docs/_INDEX.md` for docs reading order and canonical-doc priority
- `docs/product-scope.md` for product scope
- `docs/architecture.md` for architecture
- `docs/domain-model.md` for the canonical model
- `docs/implementation-gaps.md` for unresolved drift

## Generated or build output

- `dist/` under apps and packages
- `.next/` under `apps/web`
- `coverage/` where tests emit it

Do not hand-edit generated output.

## Where adapters live

- `packages/adapters/src/model-provider/`
- `packages/adapters/src/secret-manager.ts`
- other provider-facing code under `packages/adapters/src/`

## Where templates live

There is no first-class `templates/` or scaffold directory in the repo today. That is an implementation gap, not an undocumented feature.

## Where runtime code lives

- `apps/orchestrator/`
- `apps/gateway/`
- `apps/worker-manager/`
- `apps/host-agent/`
- `apps/session-reaper/`

## Where provider and secret logic lives

- `apps/ai-orchestration/`
- `packages/adapters/`
- `packages/config/`
- `packages/contracts/` for shared types

## What not to edit casually

- `packages/contracts/`
- `packages/auth/`
- `packages/database/src/migrations/`
- `AGENTS.md`
- `docs/_INDEX.md`
- ADRs and runbooks
- `infra/terraform/`

## Practical lookup

| Need | Go here |
|---|---|
| Web client behavior | `apps/web/` |
| iOS client behavior | `apps/mobile-ios/` |
| API routes | `apps/api/src/routes/` |
| Session lifecycle | `apps/orchestrator/src/services/session.ts` |
| Preview behavior | `apps/gateway/src/` |
| Provider config and runs | `apps/ai-orchestration/src/routes/` |
| Env accessors | `packages/config/src/index.ts` |
| Shared entities and enums | `packages/contracts/src/` |
| Schema and repositories | `packages/database/src/` |
| Observability helpers | `packages/observability/src/` |
