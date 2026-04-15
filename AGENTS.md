# AGENTS

This is the single root instruction file for all coding agents working in this repository. There is one active development agent. There is one execution loop. There are no multi-model chains, no phase packets, and no competing instruction systems.

## Authority

Precedence, highest to lowest:

1. `AGENTS.md` (this file)
2. Canonical-doc priority defined in [docs/\_INDEX.md](docs/_INDEX.md)
3. `README.md`

If any file conflicts with a higher-priority source, treat the lower-priority file as stale. Record the conflict in [docs/implementation-gaps.md](docs/implementation-gaps.md).

## Entry Order

For every task, read in this order:

1. This file
2. [docs/\_INDEX.md](docs/_INDEX.md)
3. The canonical docs named there for the product or subsystem you are changing
4. [docs/implementation-gaps.md](docs/implementation-gaps.md) — before trusting current code over canonical docs
5. Relevant ADRs and runbooks

## Product Constraints

These are non-negotiable:

- Solo-first.
- Hosted-first by default.
- Project-centered, not organization/workspace-centered.
- Polyglot and AI-native.
- Web and iOS are both first-class client surfaces.
- iOS is non-negotiable.
- Web remains the primary hosted surface. iOS must not be made first-class by downgrading web unless an explicit ADR says so.
- Collaboration is dormant and non-core.
- Local development is supported but is not the primary product mode.

## Canonical vs Legacy vs Archived

- **Canonical:** docs explicitly named in [docs/\_INDEX.md](docs/_INDEX.md).
- **Legacy:** code or docs still present because the repo depends on them, but not the preferred framing.
- **Archived:** historical material in `docs/archive/`. Never use as implementation authority.

## Working Rules

- Start from [docs/\_INDEX.md](docs/_INDEX.md), not root summary files.
- Prefer canonical docs over current code when docs define desired architecture or scope.
- Prefer [docs/implementation-gaps.md](docs/implementation-gaps.md) over guesswork when code differs from the canonical story.
- Do not use `.github/workflows/` as product or architecture truth. Workflow drift belongs in `docs/implementation-gaps.md`.
- Do not infer that web is secondary because iOS is first-class.
- Do not infer that iOS is optional because web is the primary hosted surface.

## Execution Loop

Single-agent. One pass per task:

1. **Read** — authority chain (this file → `_INDEX` → relevant canonical docs → `implementation-gaps.md` → ADRs/runbooks).
2. **Analyze** — use GitNexus for structural context, blast radius, or dependency tracing when useful. GitNexus is an optional context tool, not a blocking gate.
3. **Edit** — change only the scoped files required for the active task.
4. **Verify** — run task-appropriate checks (`pnpm typecheck`, `pnpm lint`, `pnpm test`, etc.). If no automated checks apply, state that.
5. **Review** — compare the diff against canonical docs and verification output. Call out residual drift.

There is no separate execution wrapper, no prompt-pack system, and no run-report artifact requirement. The agent returns results directly.

## Verification Checks

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm format:check
pnpm build
```

Run the subset that applies to the changed files. Do not skip verification unless the task is docs-only.

## GitNexus

GitNexus is available as structural repo context. Use it when it helps. Do not treat it as a mandatory ceremony.

Useful for:
- Exploring unfamiliar code: `gitnexus_query`, `gitnexus_context`
- Checking blast radius before risky edits: `gitnexus_impact`
- Verifying change scope: `gitnexus_detect_changes`
- Safe renames: `gitnexus_rename` (prefer over find-and-replace for symbol renames)

If the index is stale, run `npx gitnexus analyze` first.

## Handoff Path

When handing work to another engineer or agent:

- Point them to [docs/\_INDEX.md](docs/_INDEX.md) first.
- Then [docs/product-scope.md](docs/product-scope.md) and [docs/architecture.md](docs/architecture.md).
- Then [docs/domain-model.md](docs/domain-model.md), [docs/execution-modes.md](docs/execution-modes.md), and [docs/contracts.md](docs/contracts.md).
- Then [docs/implementation-gaps.md](docs/implementation-gaps.md) before they trust the current repo layout.



