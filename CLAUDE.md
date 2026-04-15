# CLAUDE.md

## Purpose

This file tells Claude how to work in this repository without drifting from the canonical docs, the locked product architecture, or the locked UI material system.

This file is **execution guidance**, not the primary source of product truth.

## Authority and precedence

Follow this order exactly:

1. `AGENTS.md`
2. `docs/_INDEX.md`
3. canonical docs referenced by `docs/_INDEX.md`
4. `docs/implementation-gaps.md`
5. relevant ADRs
6. relevant runbooks
7. `CLAUDE.md`
8. `AI.md`
9. `GEMINI.md`
10. `README.md`

If any lower-priority file conflicts with a higher-priority file, the higher-priority file wins.

### Important boundary

- `CLAUDE.md` does **not** override `AGENTS.md`
- `CLAUDE.md` does **not** override `docs/_INDEX.md`
- `CLAUDE.md` does **not** redefine product scope or architecture
- `CLAUDE.md` exists to help Claude execute against the already-locked repo truth

## Canonical product truth

Preserve these non-negotiable constraints:

- solo-first
- hosted-first by default
- project-centered
- polyglot
- AI-native
- web and iOS are both first-class client surfaces
- iOS is non-negotiable
- web remains the primary hosted surface
- collaboration is dormant and non-core
- local development is supported but not the primary product mode

Do not drift into:

- local-first as the main product story
- team-first or workspace-first framing
- enterprise-admin-first UX
- treating iOS as optional
- demoting web to elevate iOS
- collaboration-first product assumptions

## Canonical hosted web UI truth

When work touches hosted web UI, also treat `docs/ui-material-system.md` as canonical.

That means:

- DOM-first for text, labels, forms, and semantic controls
- WebGL material layer for primary glass and refractive surfaces
- React app shell plus react-three-fiber plus Three.js plus custom shader materials
- quality tiers
- reduced-motion handling
- fallback behavior for constrained environments
- no generic flat CSS glass as the primary visual system
- no essential copy or controls inside WebGL

The source artifact at `docs/authored-source-artifacts/neo_glass_stained_refraction_spec_v2.docx` is supporting source material, not higher authority than `docs/ui-material-system.md`.

## Documentation discipline

If a task changes meaning, update docs first.
If a task implements already-decided meaning, build it exactly.

Use this rule:

### Update docs or ADRs first when the task changes:

- product meaning
- architecture boundaries
- route or contract meaning
- runtime model
- client-surface obligations
- UI material-system rules
- quality-tier or fallback rules
- collaboration scope
- any canonical non-negotiable rule

### Implementation can proceed directly when the task:

- implements already-decided canonical behavior
- closes a documented implementation gap
- fills in a canonical screen or component without changing meaning
- improves internal structure without changing public meaning

If code reality and canonical docs disagree, do not silently reconcile them.
Use `docs/implementation-gaps.md` as the control surface.

## Working mode: strict gatekeeper phase-packet model

Claude must understand that this repo uses a **strict gatekeeper workflow**.

There is **no automatic coordination** between models.
The handshake is file-based.

### External artifact chain

For each phase:

1. Codex emits:
   - `phase-N-gemini.md`

2. Gemini emits:
   - `gemini-phase-N-results.md`

3. Codex emits:
   - `phase-N-review.md`

If the phase is not complete, patch cascade continues:

- `phase-N-patch-gemini.md`
- `gemini-phase-N-patch-results.md`
- `phase-N-patch-review.md`

Then, if needed:

- `phase-N-patch-2-gemini.md`
- `gemini-phase-N-patch-2-results.md`
- `phase-N-patch-2-review.md`

And so on until Codex declares:

- `PHASE COMPLETE`

Only after successful completion does Opus emit:

- `opus-phase-N-success-critique.md`

Then the next phase may begin.

### Important control rule

Codex may define **internal parallel workstreams inside the phase packet**, but those workstreams do **not** become separate external orchestration files unless explicitly requested.

The external handshake remains phase-level.

## How Claude should behave

### If asked to help define or refine a phase

Claude should:

- read `AGENTS.md`
- read `docs/_INDEX.md`
- read only the canonical docs relevant to the requested phase
- read `docs/implementation-gaps.md`
- read `docs/ui-material-system.md` if UI is involved
- preserve the current phase intent
- avoid reopening locked product truth
- avoid inventing broad new directions

### If asked to review implementation

Claude should review against:

- the active phase packet
- canonical docs
- `docs/implementation-gaps.md`
- `docs/ui-material-system.md` if UI is involved

Claude should be strict about:

- scope drift
- partial acceptance criteria
- happy-path-only work
- missing accessibility
- missing fallback behavior
- generic SaaS UI drift
- hidden architecture changes
- web/iOS contract drift
- DOM/WebGL boundary violations

### If asked to implement

Claude should only implement if the request is explicitly bounded and already aligned with canonical docs.
Claude must not silently invent architecture or reinterpret product truth.

If the requested work changes meaning, Claude should stop and require docs or ADR updates first.

## Production completeness standard

Inside any approved boundary, work is not complete unless all relevant parts exist:

- success path
- loading state
- empty state
- blocked state
- degraded state
- failure state
- accessibility and focus behavior
- fallback behavior where relevant
- runtime / preview / provider / AI / iOS state visibility where relevant
- no placeholder UI
- no undocumented assumptions
- no silent drift

## File and directory guidance

### Canonical truth lives in:

- `AGENTS.md`
- `docs/_INDEX.md`
- canonical docs under `docs/`
- `docs/implementation-gaps.md`
- relevant ADRs and runbooks
- `docs/ui-material-system.md` for hosted web UI material/rendering

### Execution wrapper lives in:

- `prompt-pack/`

`prompt-pack/` is not product truth.
It is the operating wrapper for Codex, Gemini, and Opus handoff files.

## What Claude must not do

- do not treat `README.md` as architecture authority
- do not treat stale code shape as higher truth than canonical docs
- do not treat `.github/workflows/` as product or architecture truth
- do not convert the product into a team workspace tool
- do not demote web
- do not treat iOS as optional
- do not flatten the hosted web UI into generic template styling
- do not move essential meaning into WebGL
- do not “just for now” change route or contract meaning without docs updates
- do not bypass the phase-packet gatekeeper model when the task is part of active phased delivery

## One-line operating rule

If it changes meaning, document it first.
If it implements meaning, build it exactly.

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
