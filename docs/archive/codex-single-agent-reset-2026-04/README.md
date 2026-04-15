# Codex Single-Agent Reset 2026-04

Back to [docs/_INDEX.md](../../_INDEX.md).

This archive preserves retired orchestration systems that have been superseded by the single instruction file at [AGENTS.md](../../../AGENTS.md).

## Why this archive exists

- The live repository workflow is a single-agent loop defined entirely in [AGENTS.md](../../../AGENTS.md).
- Product and architecture truth remain in the canonical docs under `docs/`.
- The archived files explain how earlier systems were structured without leaving them active.

## Live replacement

- [AGENTS.md](../../../AGENTS.md) — the single root instruction file.

## Archived here

- `root/CLAUDE.md` — retired model-specific instruction file.
- `prompt-pack-multimodel/**` — retired multi-model Codex/Gemini/Opus orchestration.
- `prompt-pack-single-agent/**` — retired single-agent prompt-pack wrapper (superseded by AGENTS.md execution loop).

## Deleted instead of archived

- `AI.md`
- `GEMINI.md`
- Stale `prompt-pack/runs/*.md` artifacts from the abandoned Phase 2 packet chain.

Those deleted files were duplicate, malformed, superseded, or one-off execution artifacts. Recover them from git history if historical reconstruction is ever needed.
