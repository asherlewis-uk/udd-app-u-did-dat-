# Change Protocol

Back to [docs/_INDEX.md](./_INDEX.md).

## When to create a new ADR

Create a new ADR when a change affects any of these:

- product scope
- hosted vs local execution priority
- domain model or tenancy model
- client-surface priority between web and iOS
- security boundary
- runtime or preview model
- provider or secret-manager boundary
- deployment or export ownership

## When to supersede an ADR

Supersede an ADR when:

- the decision is no longer canonical,
- a newer decision replaces it,
- or the old ADR remains useful as historical context but must not drive new implementation work.

Do not falsify history. Mark the older ADR clearly and point to the replacement ADR path.

## How to archive stale docs

1. Write the replacement doc first.
2. Update all links to point at the replacement.
3. Move the stale file to `docs/archive/solo-first-reset-2026-04/` or another clearly named archive location.
4. Leave a short stub at the original path only if the old path still matters for navigation.
5. In the final summary, name the replacement path explicitly.

Do not archive, supersede, or stub a file before those steps are complete.

## How to record implementation gaps

- Add the gap to [docs/implementation-gaps.md](./implementation-gaps.md).
- Name the desired source of truth and the current code reality explicitly.
- If a specific file is stale, name the stale file and the winning canonical source.

## Architecture-changing PR checklist

1. Re-read [docs/product-scope.md](./product-scope.md) and [docs/architecture.md](./architecture.md).
2. Re-check [docs/constraints.md](./constraints.md).
3. Decide whether a new ADR is required.
4. Update [docs/contracts.md](./contracts.md), [docs/runtime.md](./runtime.md), or [docs/flows.md](./flows.md) if the boundary changed.
5. Update [docs/ENV_CONTRACT.md](./ENV_CONTRACT.md) for config changes.
6. Update or add runbooks if operator behavior changed.
7. Log any remaining drift in [docs/implementation-gaps.md](./implementation-gaps.md).

## Root precedence rule

If root instruction files disagree:

`AGENTS.md` > canonical-doc priority from [docs/_INDEX.md](./_INDEX.md) > `README.md`

Any conflicting lower-priority file is stale by definition.

