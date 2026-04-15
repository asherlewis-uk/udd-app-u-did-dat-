# Phase 2 Patch — Web Redirect Completion and iOS Polish

## Patch goal
Close the verified remaining failures from Phase 2 that prevent the phase gate from being satisfied. Workstreams A (contracts+persistence) and B (backend routes) are accepted as complete and are not in scope for this patch.

## Prior review file
No prior review exists. The Phase 2 results file (`gemini-phase-2-results.md`) was structurally invalid and was never reviewed. This patch packet is issued based on direct repo inspection of the Phase 2 phase gate.

## Canonical docs to obey
- `AGENTS.md`
- `docs/_INDEX.md`
- `docs/product-scope.md`
- `docs/domain-model.md`
- `docs/contracts.md`
- `docs/implementation-gaps.md`
- `docs/adr/010-project-centered-identity-model.md`
- `docs/adr/013-thin-workspace-migration-strategy.md`

## Issues to fix

### Issue C-1: Legacy workspace general settings page still renders full UI
`apps/web/src/app/(dashboard)/workspaces/[workspaceId]/settings/page.tsx` (152 lines) renders a full workspace-settings UI with `useWorkspace`, workspace name, workspace ID copy, breadcrumbs saying "Workspaces". This must become a server-side redirect to `/settings/providers`.

### Issue C-2: Legacy workspace providers page still renders full UI
`apps/web/src/app/(dashboard)/workspaces/[workspaceId]/settings/providers/page.tsx` (436 lines) renders a full provider-management UI calling `apiClient.createProvider(workspaceId, ...)` and fetching `/workspaces/${workspaceId}/ai/providers`. This must become a server-side redirect to `/settings/providers`.

### Issue C-3: Legacy workspace roles page still renders full UI
`apps/web/src/app/(dashboard)/workspaces/[workspaceId]/settings/roles/page.tsx` (295 lines) renders a full roles UI calling `apiClient.createRole(workspaceId, ...)`. This must become a server-side redirect to `/projects` (since roles are now project-scoped, there is no single canonical target; redirect to `/projects` so the user can choose a project first).

### Issue C-4: Legacy workspace AI pipeline page still renders full UI
`apps/web/src/app/(dashboard)/workspaces/[workspaceId]/ai/pipelines/[pipelineId]/page.tsx` (154 lines) renders a full pipeline+run UI with workspace-scoped calls. This must attempt to resolve the pipeline's project association and redirect to `/projects/[projectId]/ai/pipelines/[pipelineId]`. If no project association exists, redirect to `/projects`.

### Issue C-5: Legacy workspace settings-nav.tsx still exists
`apps/web/src/app/(dashboard)/workspaces/[workspaceId]/settings/settings-nav.tsx` must remain untouched if it is imported only by the now-redirect pages (it becomes dead code). Verify it is not imported by any active page. If it is, it must be resolved. If not, leave it.

### Issue D-1: iOS `Workspace` struct still exists in Models.swift
`apps/mobile-ios/Sources/App/Models.swift` lines 49–58 define `struct Workspace`. The Phase 2 packet required removing it. Remove it.

### Issue D-2: iOS test file is at the wrong path
The test file exists as `apps/mobile-ios/Tests/APIDecodingTests.swift`. The Phase 2 packet required `apps/mobile-ios/Tests/UDDCompanionTests/ProjectFirstContractDecodingTests.swift`. Move and rename the test file. Update `Package.swift` if necessary for the test target.

### Issue D-3: iOS tests are incomplete
The existing tests only cover: project decoding with `workspaceId`, project decoding without `workspaceId`, session decoding without `workspaceId`. The Phase 2 packet also requires: preview binding decoding, provider config view decoding. Add those test cases.

## Allowed files to change

- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/settings/page.tsx`
- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/settings/providers/page.tsx`
- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/settings/roles/page.tsx`
- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/ai/pipelines/[pipelineId]/page.tsx`
- `apps/mobile-ios/Sources/App/Models.swift`
- `apps/mobile-ios/Tests/APIDecodingTests.swift` (to be moved/renamed)
- `apps/mobile-ios/Tests/UDDCompanionTests/ProjectFirstContractDecodingTests.swift` (new location)
- `apps/mobile-ios/Package.swift`

## Forbidden files to change

Do not modify any file outside the allowlist above. The following are explicitly forbidden:

- All `prompt-pack/**` files
- All `docs/**` files
- `AGENTS.md`
- `.github/**`
- `infra/**`
- `packages/**` — contracts, database, auth, config, events, observability, adapters are all accepted
- `apps/api/**` — backend routes are accepted
- `apps/ai-orchestration/**` — AI routes are accepted
- `apps/web/src/lib/api-client.ts` — already canonical, do not change
- `apps/web/src/hooks/**` — already canonical, do not change
- `apps/web/src/components/**` — do not change
- `apps/web/src/app/(dashboard)/projects/**` — active pages are correct, do not change
- `apps/web/src/app/(dashboard)/settings/**` — active settings pages are correct, do not change
- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/layout.tsx` — do not change
- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/page.tsx` — already a redirect
- `apps/web/src/app/(dashboard)/workspaces/page.tsx` — already a redirect
- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/ai/page.tsx` — already a redirect
- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/projects/**` — already redirect
- `apps/mobile-ios/Sources/App/APIClient.swift` — already migrated
- `apps/mobile-ios/Sources/App/ContentView.swift` — do not change
- `apps/mobile-ios/Sources/App/WorkspacesView.swift` — do not change
- All other `apps/mobile-ios/Sources/App/*.swift` files

## Acceptance criteria for the patch

1. `workspaces/[workspaceId]/settings/page.tsx` contains only a server-side redirect to `/settings/providers`. No UI rendering. No `useWorkspace`. No workspace chrome.
2. `workspaces/[workspaceId]/settings/providers/page.tsx` contains only a server-side redirect to `/settings/providers`. No UI rendering.
3. `workspaces/[workspaceId]/settings/roles/page.tsx` contains only a server-side redirect to `/projects`. No UI rendering.
4. `workspaces/[workspaceId]/ai/pipelines/[pipelineId]/page.tsx` contains only a server-side redirect to `/projects`. No UI rendering. (A smarter redirect that resolves the project from the pipeline would be ideal, but a safe fallback to `/projects` is acceptable.)
5. iOS `Models.swift` no longer defines `struct Workspace`.
6. iOS test file exists at `apps/mobile-ios/Tests/UDDCompanionTests/ProjectFirstContractDecodingTests.swift` and contains decoding tests for: project list item, project detail, session, preview binding, provider config view.
7. `Package.swift` test target points to the correct test file location.
8. `pnpm typecheck` passes.
9. `pnpm build` passes.

## Accessibility and fallback requirements
- Redirect-only legacy pages must use server redirects (`redirect()` from `next/navigation`) and must not display a loading shell or briefly render workspace UI.
- No redirect page may render workspace names, workspace breadcrumbs, or workspace-specific call-to-action copy.

## UI material-system requirements if relevant
Not relevant. This is a redirect and test cleanup patch. No visual system changes.

## Evidence Gemini must return
- Exact list of changed files.
- Confirmation that all four workspace settings/AI pages now contain redirect-only code.
- Confirmation that no active page imports `settings-nav.tsx` from the legacy settings path.
- Confirmation that iOS `Workspace` struct is removed from `Models.swift`.
- Confirmation that iOS test file is at the canonical path with all required test cases.
- Command output summary for:
  - `pnpm typecheck`
  - `pnpm build`
  - `swift test --package-path apps/mobile-ios` if available
- If any command was not run or could not run, the exact reason.

## Stop conditions
- Stop if implementation requires modifying any file outside the allowlist.
- Stop if converting a legacy page to a redirect would break an active page's import.
- Stop if typecheck or build failures require touching backend, contract, or active page files.
- Stop if the iOS test target cannot be created without restructuring `Package.swift` beyond the test target path.

## Final instruction
Implement this phase packet exactly.
