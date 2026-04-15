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

<!-- gitnexus:start -->
# GitNexus — Code Intelligence

This project is indexed by GitNexus as **udd-app(u-did-dat)** (2116 symbols, 4533 relationships, 120 execution flows). Use the GitNexus MCP tools to understand code, assess impact, and navigate safely.

> If any GitNexus tool warns the index is stale, run `npx gitnexus analyze` in terminal first.

## Always Do

- **MUST run impact analysis before editing any symbol.** Before modifying a function, class, or method, run `gitnexus_impact({target: "symbolName", direction: "upstream"})` and report the blast radius (direct callers, affected processes, risk level) to the user.
- **MUST run `gitnexus_detect_changes()` before committing** to verify your changes only affect expected symbols and execution flows.
- **MUST warn the user** if impact analysis returns HIGH or CRITICAL risk before proceeding with edits.
- When exploring unfamiliar code, use `gitnexus_query({query: "concept"})` to find execution flows instead of grepping. It returns process-grouped results ranked by relevance.
- When you need full context on a specific symbol — callers, callees, which execution flows it participates in — use `gitnexus_context({name: "symbolName"})`.

## When Debugging

1. `gitnexus_query({query: "<error or symptom>"})` — find execution flows related to the issue
2. `gitnexus_context({name: "<suspect function>"})` — see all callers, callees, and process participation
3. `READ gitnexus://repo/udd-app(u-did-dat)/process/{processName}` — trace the full execution flow step by step
4. For regressions: `gitnexus_detect_changes({scope: "compare", base_ref: "main"})` — see what your branch changed

## When Refactoring

- **Renaming**: MUST use `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` first. Review the preview — graph edits are safe, text_search edits need manual review. Then run with `dry_run: false`.
- **Extracting/Splitting**: MUST run `gitnexus_context({name: "target"})` to see all incoming/outgoing refs, then `gitnexus_impact({target: "target", direction: "upstream"})` to find all external callers before moving code.
- After any refactor: run `gitnexus_detect_changes({scope: "all"})` to verify only expected files changed.

## Never Do

- NEVER edit a function, class, or method without first running `gitnexus_impact` on it.
- NEVER ignore HIGH or CRITICAL risk warnings from impact analysis.
- NEVER rename symbols with find-and-replace — use `gitnexus_rename` which understands the call graph.
- NEVER commit changes without running `gitnexus_detect_changes()` to check affected scope.

## Tools Quick Reference

| Tool | When to use | Command |
|------|-------------|---------|
| `query` | Find code by concept | `gitnexus_query({query: "auth validation"})` |
| `context` | 360-degree view of one symbol | `gitnexus_context({name: "validateUser"})` |
| `impact` | Blast radius before editing | `gitnexus_impact({target: "X", direction: "upstream"})` |
| `detect_changes` | Pre-commit scope check | `gitnexus_detect_changes({scope: "staged"})` |
| `rename` | Safe multi-file rename | `gitnexus_rename({symbol_name: "old", new_name: "new", dry_run: true})` |
| `cypher` | Custom graph queries | `gitnexus_cypher({query: "MATCH ..."})` |

## Impact Risk Levels

| Depth | Meaning | Action |
|-------|---------|--------|
| d=1 | WILL BREAK — direct callers/importers | MUST update these |
| d=2 | LIKELY AFFECTED — indirect deps | Should test |
| d=3 | MAY NEED TESTING — transitive | Test if critical path |

## Resources

| Resource | Use for |
|----------|---------|
| `gitnexus://repo/udd-app(u-did-dat)/context` | Codebase overview, check index freshness |
| `gitnexus://repo/udd-app(u-did-dat)/clusters` | All functional areas |
| `gitnexus://repo/udd-app(u-did-dat)/processes` | All execution flows |
| `gitnexus://repo/udd-app(u-did-dat)/process/{name}` | Step-by-step execution trace |

## Self-Check Before Finishing

Before completing any code modification task, verify:
1. `gitnexus_impact` was run for all modified symbols
2. No HIGH/CRITICAL risk warnings were ignored
3. `gitnexus_detect_changes()` confirms changes match expected scope
4. All d=1 (WILL BREAK) dependents were updated

## Keeping the Index Fresh

After committing code changes, the GitNexus index becomes stale. Re-run analyze to update it:

```bash
npx gitnexus analyze
```

If the index previously included embeddings, preserve them by adding `--embeddings`:

```bash
npx gitnexus analyze --embeddings
```

To check whether embeddings exist, inspect `.gitnexus/meta.json` — the `stats.embeddings` field shows the count (0 means no embeddings). **Running analyze without `--embeddings` will delete any previously generated embeddings.**

> Claude Code users: A PostToolUse hook handles this automatically after `git commit` and `git merge`.

## CLI

| Task | Read this skill file |
|------|---------------------|
| Understand architecture / "How does X work?" | `.claude/skills/gitnexus/gitnexus-exploring/SKILL.md` |
| Blast radius / "What breaks if I change X?" | `.claude/skills/gitnexus/gitnexus-impact-analysis/SKILL.md` |
| Trace bugs / "Why is X failing?" | `.claude/skills/gitnexus/gitnexus-debugging/SKILL.md` |
| Rename / extract / split / refactor | `.claude/skills/gitnexus/gitnexus-refactoring/SKILL.md` |
| Tools, resources, schema reference | `.claude/skills/gitnexus/gitnexus-guide/SKILL.md` |
| Index, status, clean, wiki CLI commands | `.claude/skills/gitnexus/gitnexus-cli/SKILL.md` |

<!-- gitnexus:end -->
