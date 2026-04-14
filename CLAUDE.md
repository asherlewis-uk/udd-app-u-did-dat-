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
