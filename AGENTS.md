# AGENTS

This is the canonical root instruction file for Codex and all coding agents working in this repository.

Use Codex as the architect, reviewer, and source-of-truth enforcer. Optimize implementation handoff for Google Antigravity with Gemini 3.1 Pro as the primary coding model, but do not let model-specific wrappers override this file.

## Entry Order

Read in this order:

1. [docs/\_INDEX.md](docs/_INDEX.md)
2. The canonical docs named there for the product or subsystem you are changing
3. [docs/implementation-gaps.md](docs/implementation-gaps.md) before trusting current code or workflows over canonical docs
4. Relevant ADRs and runbooks

## Precedence

Root instruction precedence is:
`AGENTS.md` > canonical-doc priority defined in `docs/_INDEX.md` > `CLAUDE.md` > `AI.md` > `GEMINI.md` > `README.md`

If any file conflicts with this file or with the canonical-doc priority from `docs/_INDEX.md`, treat that file as stale. Do not silently blend definitions. Record the conflict in [docs/implementation-gaps.md](docs/implementation-gaps.md).

## Canonical Product Story

- The product is solo-first.
- The product is hosted-first by default.
- Local development is supported.
- The product is polyglot and AI-native.
- Web and iOS are both first-class client surfaces.
- iOS is non-negotiable.
- iOS must not be made first-class by downgrading, removing, or reframing the hosted web surface unless an explicit ADR says so.
- The canonical product model is project-centered, not organization/workspace-centered.

## Canonical vs Legacy vs Archived

- Canonical: the docs explicitly named as canonical in [docs/\_INDEX.md](docs/_INDEX.md).
- Legacy: code or documents still present because the repo still depends on them, but they are not the preferred product or architecture framing.
- Archived: historical material only. Never use archived docs as implementation authority.

## Working Rules

- Start from [docs/\_INDEX.md](docs/_INDEX.md), not from root summary files.
- Prefer canonical docs over current code when the docs define desired architecture or scope.
- Prefer [docs/implementation-gaps.md](docs/implementation-gaps.md) over guesswork whenever current code differs from the canonical story.
- Do not use `.github/workflows/` as product or architecture truth. Workflow drift belongs in `docs/implementation-gaps.md`.
- Do not infer that web is secondary because iOS is first-class.
- Do not infer that iOS is optional because web is the primary hosted surface.

## Handoff Path

When handing work to another engineer or agent:

- point them to [docs/\_INDEX.md](docs/_INDEX.md) first
- point them to [docs/product-scope.md](docs/product-scope.md) and [docs/architecture.md](docs/architecture.md) next
- point them to [docs/domain-model.md](docs/domain-model.md), [docs/execution-modes.md](docs/execution-modes.md), and [docs/contracts.md](docs/contracts.md) for implementation shape
- point them to [docs/implementation-gaps.md](docs/implementation-gaps.md) before they trust the current repo layout or workflows
