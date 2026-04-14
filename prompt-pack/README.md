# UDD Strict Gatekeeper Phase-Packet Pack

This pack is for running UDD in **strict gatekeeper mode** with **phase-level handoff files** and an **Opus 4.6 post-phase critic pass only after successful phase completion**.

This is the correct orchestration model:

- **Codex owns the phase**
- **Codex emits one exact phase packet for Gemini**
- **Gemini returns one exact phase results file**
- **Codex reviews the phase as a whole**
- if the phase is not complete, Codex emits a **patch packet**
- Gemini returns a **patch results file**
- Codex emits a **patch review**
- repeat until Codex says the phase is complete
- **only after successful phase completion does Opus 4.6 provide critic feedback**
- only then do you move to the next phase

There is **no automatic coordination** between Codex, Gemini, and Opus.
They do not see each other unless you relay the files.
The files are the handshake.

## Where to put this pack

Drop this extracted folder at repo root as:

`/prompt-pack/`

Expected structure:

```text
/prompt-pack/
  README.md
  PHASES.md
  PHASE_REQUEST.md
  /codex/
    00_START_PHASE.md
    02_REVIEW_PHASE.md
    03_DOC_OR_ADR_ESCALATION.md
  /gemini/
    01_EXECUTE_PHASE_PACKET.md
  /opus/
    04_SUCCESSFUL_PHASE_CRITIC.md
  /templates/
    phase-gemini.template.md
    gemini-phase-results.template.md
    phase-review.template.md
    phase-patch-gemini.template.md
    gemini-phase-patch-results.template.md
    phase-patch-review.template.md
    opus-phase-success-critique.template.md
  /runs/
    .gitkeep
```

Keep these canonical files where they already belong:

```text
/AGENTS.md
/docs/_INDEX.md
/docs/implementation-gaps.md
/docs/ui-material-system.md
/docs/authored-source-artifacts/neo_glass_stained_refraction_spec_v2.docx
```

## Do any docs need rewriting for this pack?

No.

This pack does **not** require `/docs` rewrites.
It is an execution wrapper around the already-stable authority chain.

## Authority chain

Always build against:
`AGENTS.md` > canonical docs from `docs/_INDEX.md` > `docs/implementation-gaps.md`

For hosted web UI work, also treat:
`docs/ui-material-system.md`
as canonical for rendering and material behavior.

## Non-negotiable repo truth

UDD is:
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

The hosted web UI is:
- DOM-first for text, labels, and controls
- WebGL-material-driven for primary glass and refractive surfaces
- React app shell plus react-three-fiber plus Three.js plus custom shader materials
- quality-tiered with reduced-motion handling and fallback path

## Mandatory external file pattern

### Initial phase artifacts
Codex must emit:
- `phase-1-gemini.md`

Gemini must emit:
- `gemini-phase-1-results.md`

Codex must then emit:
- `phase-1-review.md`

### Patch cascade if phase 1 is not complete
Codex emits:
- `phase-1-patch-gemini.md`

Gemini emits:
- `gemini-phase-1-patch-results.md`

Codex emits:
- `phase-1-patch-review.md`

If still not complete:
- `phase-1-patch-2-gemini.md`
- `gemini-phase-1-patch-2-results.md`
- `phase-1-patch-2-review.md`

If still not complete:
- `phase-1-patch-3-gemini.md`
- `gemini-phase-1-patch-3-results.md`
- `phase-1-patch-3-review.md`

Repeat until Codex says:
- `PHASE COMPLETE`

### Only after successful completion
Opus then emits:
- `opus-phase-1-success-critique.md`

### Phase 2 then starts cleanly
- `phase-2-gemini.md`
- `gemini-phase-2-results.md`
- `phase-2-review.md`

Patch cascade repeats if needed.

Only after `PHASE COMPLETE` for phase 2:
- `opus-phase-2-success-critique.md`

## Important clarification

Codex may define **internal parallel workstreams inside the phase packet**, but you do **not** manage those as separate external files.

That means:
- Codex can say the phase contains internal workstreams A, B, C
- Gemini can report against those internal workstreams inside one results file
- Opus can critique the completed phase as a whole
- but the external handshake remains **phase-level**, not slice-level

This is the control model:
- you manage one phase packet chain
- Codex manages the internal decomposition
- Gemini executes the packet
- Opus critiques only successful phases

## Tiny loop

### Step 1 — request a phase
Fill `prompt-pack/PHASE_REQUEST.md`

Example:
- `Proceed with Phase 1`
- `Proceed with Phase 2`

### Step 2 — Codex defines the phase
Send these files to Codex:
- `prompt-pack/codex/00_START_PHASE.md`
- `prompt-pack/PHASE_REQUEST.md`
- `prompt-pack/PHASES.md`

Codex must return the complete contents for exactly one file:
- `phase-1-gemini.md`

Save it into:
- `prompt-pack/runs/phase-1-gemini.md`

### Step 3 — Gemini executes the phase packet
Send these files to Gemini or Antigravity:
- `prompt-pack/gemini/01_EXECUTE_PHASE_PACKET.md`
- `prompt-pack/runs/phase-1-gemini.md`

Gemini must return the complete contents for exactly one file:
- `gemini-phase-1-results.md`

Save it into:
- `prompt-pack/runs/gemini-phase-1-results.md`

### Step 4 — Codex reviews the phase
Send these files to Codex:
- `prompt-pack/codex/02_REVIEW_PHASE.md`
- `prompt-pack/runs/phase-1-gemini.md`
- `prompt-pack/runs/gemini-phase-1-results.md`

Codex must return the complete contents for exactly one file:
- `phase-1-review.md`

Save it into:
- `prompt-pack/runs/phase-1-review.md`

### Step 5 — if the phase is not complete
If Codex review does not end with `PHASE COMPLETE`, then Codex must emit the next patch packet.

For the first patch cycle, use context from:
- `prompt-pack/runs/phase-1-gemini.md`
- `prompt-pack/runs/gemini-phase-1-results.md`
- `prompt-pack/runs/phase-1-review.md`

Codex should then emit:
- `phase-1-patch-gemini.md`

Save it into:
- `prompt-pack/runs/phase-1-patch-gemini.md`

Then send to Gemini:
- `prompt-pack/gemini/01_EXECUTE_PHASE_PACKET.md`
- `prompt-pack/runs/phase-1-patch-gemini.md`

Gemini returns:
- `gemini-phase-1-patch-results.md`

Save it into:
- `prompt-pack/runs/gemini-phase-1-patch-results.md`

Then send to Codex:
- `prompt-pack/codex/02_REVIEW_PHASE.md`
- `prompt-pack/runs/phase-1-patch-gemini.md`
- `prompt-pack/runs/gemini-phase-1-patch-results.md`

Codex returns:
- `phase-1-patch-review.md`

Save it into:
- `prompt-pack/runs/phase-1-patch-review.md`

If another patch is required, repeat with:
- `phase-1-patch-2-gemini.md`
- `gemini-phase-1-patch-2-results.md`
- `phase-1-patch-2-review.md`

Continue until Codex says:
- `PHASE COMPLETE`

### Step 6 — only after successful phase completion, run Opus
Once the latest Codex review ends with:
- `PHASE COMPLETE`

Then send to Opus 4.6:
- `prompt-pack/opus/04_SUCCESSFUL_PHASE_CRITIC.md`
- the latest completed phase packet file
- the latest completed phase results file
- the latest completed phase review file
- optionally the immediately preceding patch chain files for context

Opus must return the complete contents for exactly one file:
- `opus-phase-1-success-critique.md`

Save it into:
- `prompt-pack/runs/opus-phase-1-success-critique.md`

### Step 7 — move to the next phase
Only after:
- Codex says `PHASE COMPLETE`

Opus does **not** gate completion. Opus provides feedback only after success.
Then update `PHASE_REQUEST.md` to:
- `Proceed with Phase 2`

## Hard rules

1. Never build from memory.
2. Never bypass Codex at phase boundaries.
3. Gemini never defines scope.
4. Gemini never decides next work.
5. Codex must be the one emitting the exact phase packet.
6. Gemini must return the exact paired phase results file.
7. Opus only critiques successful phases.
8. No packet means no implementation.
9. No review means no next step.
10. Never weaken web and iOS first-class obligations.
11. Never replace the canonical UI material system with generic SaaS UI.
12. Never move essential copy or controls into WebGL.
13. Never leave happy-path-only behavior in a phase.
14. Never mark a phase complete if acceptance criteria are partial.

## Production completeness rule

Every phase packet must be production-complete **inside the boundary of that phase**.

That means, if relevant:
- success path
- loading state
- empty state
- blocked state
- degraded state
- failure state
- accessibility and focus behavior
- fallback behavior
- runtime / preview / provider / AI / iOS state visibility
- no placeholder UI
- no undocumented behavior
- no silent drift

## Most important one-line rule

Codex issues the phase.
Gemini reports the phase.
Codex decides when the phase is complete.
Only then does Opus critique it.
