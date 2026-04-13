# Runbook: Docs Source-of-Truth Drift

**Status:** Canonical  
Back to [docs/_INDEX.md](../_INDEX.md).

## Use this runbook when

- two docs disagree
- a root entrypoint conflicts with canonical docs
- an ADR no longer reflects the canonical product or architecture
- a workflow or implementation detail contradicts the docs

## Resolution order

1. `AGENTS.md`
2. canonical-doc priority from [docs/_INDEX.md](../_INDEX.md)
3. `AI.md`
4. `GEMINI.md`
5. `README.md`

## Procedure

1. Identify the conflicting files.
2. Determine the winning canonical source using the order above.
3. Rewrite or replace the stale file.
4. Record unresolved implementation drift in [docs/implementation-gaps.md](../implementation-gaps.md).
5. If an ADR changed, supersede it with a new ADR instead of editing history into a lie.
6. If a stale doc must be archived, create the replacement first, update links, and name the replacement path in the final summary.

## Notes

- Archived docs are lower-priority than canonical docs by definition.
- Do not let README-style files become silent architecture sources.
