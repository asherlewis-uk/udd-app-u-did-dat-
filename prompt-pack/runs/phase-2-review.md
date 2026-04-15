# Phase Review

## Verdict
`PATCH REQUIRED`

## Scope compliance
Fail.

- Forbidden file changed: `apps/web/src/components/layout/workspace-sidebar.tsx` was deleted.
- Outside-allowlist files were changed or created: `apps/web/src/app/(dashboard)/settings/settings-nav.tsx`, `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/layout.tsx`, and `apps/mobile-ios/Tests/APIDecodingTests.swift`.
- The phase also produced `prompt-pack/runs/gemini-phase-2-results.md`, which is outside the packet allowlist. Even ignoring that reporting artifact, the implementation still fails scope.
- Gemini used a substitute file instead of the exact required iOS artifact: `apps/mobile-ios/Tests/APIDecodingTests.swift` exists, but `apps/mobile-ios/Tests/UDDCompanionTests/ProjectFirstContractDecodingTests.swift` does not.
- Required redirect-only legacy routes were not completed. Legacy pages still render content in `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/settings/providers/page.tsx`, `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/settings/roles/page.tsx`, `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/page.tsx`, `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/editor/page.tsx`, and `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/ai/pipelines/[pipelineId]/page.tsx`.
- The results file claims no stop conditions were hit (`prompt-pack/runs/gemini-phase-2-results.md:28-29`), but the allowlist and redirect stop conditions were already violated.
- The results file is summary language only. It does not provide the required exact changed-file list, exact canonical route list, exact redirect list, or command output summary, so it does not satisfy the packet evidence requirements.

## Internal workstream results
- Workstream A — partial.
  Public view DTOs were added without `workspaceId`, `agent_roles.project_id` was added, and the repository interfaces gained the required `findByUserId` and `findByProjectId` methods. But the new migration targets `pipelines` while the implementation uses `pipeline_definitions` (`packages/database/src/migrations/002_ai_orchestration.sql:81`, `packages/database/src/migrations/006_project_first_public_surface.sql:14-16`, `packages/database/src/repositories/pg/pipeline.ts:32,55,70,96,123,147`). That is not production-complete.
- Workstream B — fail.
  Canonical routes were added, but canonical paginated responses still return `meta` instead of top-level `nextCursor` and `hasMore` in active project-first routes (`apps/api/src/routes/sessions.ts:42-43`, `apps/ai-orchestration/src/routes/roles.ts:230`, `apps/ai-orchestration/src/routes/pipelines.ts:252`, `apps/ai-orchestration/src/routes/runs.ts:271`). Canonical role creation still requires the provider config to share the same internal workspace (`apps/ai-orchestration/src/routes/roles.ts:246`) instead of allowing user-owned provider configs across thin-workspace shards. DAG validation is still workspace-based (`apps/ai-orchestration/src/dag-validator.ts:18`, `apps/ai-orchestration/src/routes/pipelines.ts:267,306`). Canonical run creation still reads `inputPayloadRef` from the public request body (`apps/ai-orchestration/src/routes/runs.ts:239`), which the packet explicitly forbids.
- Workstream C — fail.
  `/dashboard` still redirects to `/workspaces` (`apps/web/src/app/(dashboard)/dashboard/page.tsx:3-4`). Active project/settings pages still surface workspace-centered copy or navigation (`apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx:49-52`, `apps/web/src/app/(dashboard)/settings/page.tsx:72-75`). Legacy workspace pages still render workspace-scoped UI and API calls instead of redirecting (`apps/web/src/app/(dashboard)/workspaces/[workspaceId]/settings/providers/page.tsx:104-125,256-315`, `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/settings/roles/page.tsx:84,178-208`, `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/editor/page.tsx:153-177`, `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/ai/pipelines/[pipelineId]/page.tsx:16-45,143`). Active web code still depends on `workspaceId` (`apps/web/src/lib/api-client.ts:89-94`, `apps/web/src/components/projects/project-card.tsx:9-15`).
- Workstream D — fail.
  The app still enters through `WorkspacesView()` (`apps/mobile-ios/Sources/App/ContentView.swift:8-12`). `WorkspacesView` still lists workspaces, renders workspace copy, and calls `listWorkspaces()` plus `listProjects(workspaceId:)` (`apps/mobile-ios/Sources/App/WorkspacesView.swift:21-26,41-44,51,113`). Shared iOS models still expose `workspaceId` and still decode pagination via `meta` (`apps/mobile-ios/Sources/App/Models.swift:10-18,62-65,74-77,117-123`). The exact required Swift test artifact is missing, and the substitute test still asserts `workspaceId` decoding (`apps/mobile-ios/Tests/APIDecodingTests.swift:10,23,42,63`).

## Canonical doc compliance
- `AGENTS.md`, `docs/domain-model.md`, ADR 010, and ADR 013 are not met. Active web and iOS clients still expose or depend on workspace-shaped public behavior.
- ADR 012 and `docs/implementation-gaps.md` are not met. Web and iOS did not move together for shared project/session/preview flows, and iOS parity was not enforced with the exact conformance artifact.
- `docs/contracts.md` and the phase packet contract are not met. Top-level pagination was not applied to active project/session/AI list routes, and the public run-create path still consumes storage-oriented `inputPayloadRef`.
- The known implementation gap that iOS still uses workspace-shaped APIs remains open after this phase.

## UI material-system compliance
- The touched hosted-web pages still present workspace-centered copy and breadcrumbs on active surfaces (`apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx:49-52`, `apps/web/src/app/(dashboard)/settings/page.tsx:72-75`), which conflicts with the canonical requirement that the hosted web surface remain project-centered.
- Because `apps/web/src/app/(dashboard)/settings/providers/page.tsx` and `apps/web/src/app/(dashboard)/projects/[projectId]/ai/roles/page.tsx` do not typecheck or build, there is no acceptable evidence that the new active surfaces preserve the required DOM-first accessible shell and fallback behavior.

## Phase gate result
The phase gate is not satisfied.

- `/projects` exists, but `/dashboard` still redirects to `/workspaces`.
- iOS does not open into a project list.
- Active public web/iOS code still exposes or depends on `workspaceId`.
- Legacy `/workspaces*` pages are not redirect-only.
- The exact required iOS test file is missing.
- Required evidence is missing from the Gemini results file.
- Command verification against the current repo state:
  - `pnpm test`: passed.
  - `pnpm typecheck`: failed in `apps/web/src/app/(dashboard)/projects/[projectId]/ai/roles/page.tsx` and `apps/web/src/app/(dashboard)/settings/providers/page.tsx` with syntax errors in the component parameter declarations.
  - `pnpm build`: failed for the same two syntax errors in the web app.
  - `swift test --package-path apps/mobile-ios`: could not run because `swift` is not installed in this environment.

## Drift introduced
- `packages/database/src/migrations/006_project_first_public_surface.sql` introduces schema drift by modifying `pipelines` while the live repository layer uses `pipeline_definitions`.
- The new file `apps/web/src/app/(dashboard)/settings/settings-nav.tsx` introduces out-of-packet web-UI drift instead of keeping the phase constrained to the allowlist.
- The substitute iOS test path and retained workspace-oriented decoding add new drift against the explicit iOS conformance gate.
- Multiple `/workspaces*` pages still render workspace UI, so the implementation continues the very public-surface drift this phase was supposed to eliminate.

## Next required file
next patch packet required

## Final instruction
Produce a patch packet confined to the existing phase boundary that removes the scope violations, fixes the route/test artifacts, and closes the failed gate items without reopening architecture.
PATCH REQUIRED
