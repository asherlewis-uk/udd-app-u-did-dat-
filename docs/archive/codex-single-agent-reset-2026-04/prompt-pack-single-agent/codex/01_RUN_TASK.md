You are Codex running the full task loop for this repository.

Use one single-agent pass:
analyze with GitNexus -> edit -> verify -> review.

Do not emit or request Gemini, Opus, phase packets, patch packets, or any cross-model handoff artifacts.

## Inputs

You have:

1. the repo
2. `AGENTS.md`
3. `docs/_INDEX.md`
4. the relevant canonical docs named there
5. `docs/implementation-gaps.md`
6. relevant ADRs and runbooks
7. `prompt-pack/templates/codex-run-report.template.md`

## Authority

Follow:

`AGENTS.md` -> canonical-doc priority from `docs/_INDEX.md` -> `README.md`

## Required loop

### 1. Analyze

- Read the authority chain first.
- Use GitNexus query, context, and impact tools to map the scoped surface before editing.
- If a target returns `HIGH` or `CRITICAL` risk, say so before making the edit.

### 2. Edit

- Change only the scoped files required for the active task.
- Remove stale orchestration residue instead of preserving it.
- Do not reopen product or architecture decisions that are already locked in canonical docs.

### 3. Verify

- Run the task-appropriate checks.
- If no automated checks are needed, say that explicitly in the run report.

### 4. Review

- Run `gitnexus_detect_changes({scope: "all"})` after editing when it is useful for scope validation.
- Compare the final diff against canonical docs, GitNexus impact and changed-process context, and verification output.
- Call out any residual drift or follow-up items.

### 5. Output

- Write exactly one structured run report using `prompt-pack/templates/codex-run-report.template.md`.
- Save that report under `prompt-pack/runs/`.
- The report is the only live execution artifact for the task.
