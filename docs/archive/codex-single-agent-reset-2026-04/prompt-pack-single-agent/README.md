# Codex-Only Prompt Pack

This folder is the live execution wrapper for bounded repository tasks. It does not define product or architecture truth.

## Authority

Always follow:

`AGENTS.md` -> `docs/_INDEX.md` -> relevant canonical docs -> `docs/implementation-gaps.md` -> relevant ADRs and runbooks -> this prompt pack

## Live file set

- `prompt-pack/README.md`
- `prompt-pack/codex/01_RUN_TASK.md`
- `prompt-pack/templates/codex-run-report.template.md`
- `prompt-pack/runs/.gitkeep`

## Operator loop

1. Read `AGENTS.md`, `docs/_INDEX.md`, the relevant canonical docs, and `docs/implementation-gaps.md`.
2. Use GitNexus to analyze the scoped area before editing. Run impact analysis for symbols or authoritative files when the change touches them.
3. Edit only the files required for the active task.
4. Verify with the task-appropriate checks.
5. Review the final state against canonical docs, GitNexus change context, and verification output.
6. Write exactly one structured run report in `prompt-pack/runs/` using `prompt-pack/templates/codex-run-report.template.md`.

## Hard rules

- No Gemini executor layer.
- No Opus critic layer.
- No phase packets, patch packets, or cross-model handoff files.
- No live orchestration artifacts outside `prompt-pack/runs/`.
- Archived multi-model files under `docs/archive/codex-single-agent-reset-2026-04/` are historical only.
- No separate runbook is required for this wrapper; this file is the operator workflow.
