# Phase Packet

## Phase name
Re-baselined Phase 2: remaining project-first public-surface completion

## Phase goal
Treat the current working tree as the new Phase 2 baseline and complete only the unresolved project-first migration work that still blocks the locked public surface.

This replacement Phase 2 is limited to:

- finishing the remaining canonical backend contract and validation fixes already implied by the current public DTOs
- cleaning up the active hosted web surface so it no longer leaks workspace-first copy or internal entity fields
- finishing the iOS shared-flow migration so web and iOS consume the same project-first project, session, preview, and comment model

Do not restart the original broad Phase 2 scope. Do not reopen already-landed work. Do not create a patch packet. Do not create Phase 3.

## Why this phase exists now
Much of the original Phase 2 intent is already present in the repo, but the original packet is no longer a clean execution baseline. The current repo already has canonical `/projects` routes, project-first web screens, public DTOs in `packages/contracts/src/api.ts`, and an iOS conformance-test path. What remains is a narrower cleanup pass over unresolved drift:

- canonical list routes still mix top-level pagination and legacy `meta` envelopes
- some canonical AI route behaviors still use workspace-shaped validation or request handling
- the active hosted web surface still contains workspace-first copy and internal entity-shape assumptions
- the active hosted web preview panel still depends on internal session host fields that were intentionally removed from the public surface
- iOS still enters through a workspace list and still models shared-flow payloads with workspace-bearing or `meta`-based shapes

This packet re-baselines the current repo state and scopes only that remaining work.

## Canonical docs to obey

- `AGENTS.md`
- `docs/_INDEX.md`
- `docs/product-scope.md`
- `docs/architecture.md`
- `docs/domain-model.md`
- `docs/contracts.md`
- `docs/flows.md`
- `docs/implementation-gaps.md`
- `docs/quality-gates.md`
- `docs/ui-material-system.md`
- `docs/adr/010-project-centered-identity-model.md`
- `docs/adr/011-hosted-preview-default.md`
- `docs/adr/012-web-and-ios-first-class-client-surfaces.md`
- `docs/adr/013-thin-workspace-migration-strategy.md`

## Phase gate

- Canonical project-first list routes used by active shared flows return the shared top-level pagination shape exactly: `data`, `nextCursor`, `hasMore`, `correlationId`.
- The canonical routes that still needed completion in this repo state now honor the existing public request contracts in `packages/contracts/src/api.ts` without reading client-supplied internal fields such as `inputPayloadRef`.
- Provider, role, pipeline, and run canonical route logic is user-scoped or project-scoped exactly as already decided, without reintroducing workspace-first public semantics.
- `packages/database/src/migrations/006_project_first_public_surface.sql` matches the real current schema and does not reference the nonexistent `pipelines` table.
- The hosted web post-auth landing remains `/projects`, `/dashboard` redirects to `/projects`, and the remaining legacy workspace project pages are redirect-only.
- No active hosted web page, active hosted web client type, or active iOS shared-flow model depends on `workspaceId`, `workerHost`, or `hostPort`.
- Hosted web preview no longer derives direct worker URLs from session data. It uses preview-binding semantics only and falls back to an explicit blocked or unavailable state if authenticated iframe embedding cannot be completed inside this phase.
- iOS opens into a project list, not a workspace list, and its shared-flow pagination model matches the canonical top-level response envelope.
- `pnpm typecheck`, `pnpm test`, and `pnpm build` pass. `swift test --package-path apps/mobile-ios` passes if Swift is available; otherwise the exact environment limitation is reported.

## Internal parallel workstreams

| Workstream ID | Workstream name | Category | Can run in parallel with | Blocked by | Primary files likely touched |
|---|---|---|---|---|---|
| A | Backend contract completion | backend | B, C | none | `packages/database/src/migrations/006_project_first_public_surface.sql`, `apps/api/src/routes/sessions.ts`, `apps/api/src/routes/collaboration.ts`, `apps/ai-orchestration/src/routes/*`, `apps/ai-orchestration/src/dag-validator.ts` |
| B | Hosted web active-surface cleanup | web | A, C | A for final API semantics | `apps/web/src/app/(dashboard)/**/*`, `apps/web/src/lib/api-client.ts`, `apps/web/src/hooks/*`, selected active components |
| C | iOS shared-flow completion | iOS | A, B | A for final pagination semantics | `apps/mobile-ios/Sources/App/*`, `apps/mobile-ios/Tests/UDDCompanionTests/ProjectFirstContractDecodingTests.swift` |

### Workstream A — Backend contract completion

- Goal
  Finish the remaining backend-side project-first contract, migration, and validation gaps without reopening already-landed routes or public DTO definitions.
- In scope
  Correct `packages/database/src/migrations/006_project_first_public_surface.sql` so it targets the real current pipeline table and preserves thin-workspace internal storage semantics.
  Update these canonical list routes to return the shared top-level pagination envelope instead of `meta`:
  `GET /v1/projects/:id/sessions`
  `GET /v1/projects/:id/comments`
  `GET /v1/projects/:projectId/ai/roles`
  `GET /v1/projects/:projectId/ai/pipelines`
  `GET /v1/projects/:projectId/ai/runs`
  Keep route paths and internal membership checks intact where they are already canonical.
  In `apps/ai-orchestration/src/routes/providers.ts`:
  enforce deterministic owner-scoped active-name uniqueness on create and update
  treat `RotateSecretRequest.newCredential` as the public input field
  keep public provider scoping user-owned, not workspace-routed
  In `apps/ai-orchestration/src/routes/roles.ts`:
  require provider ownership by `createdByUserId === req.auth.userId`
  stop using workspace-match logic as the public authorization rule for canonical project role creation
  In `apps/ai-orchestration/src/dag-validator.ts`, `routes/pipelines.ts`, and related tests:
  make DAG validation project-scoped rather than workspace-scoped
  ensure canonical pipeline create and update validate only roles from the same project
  In `apps/ai-orchestration/src/routes/runs.ts`:
  honor the existing public run-create contract in `packages/contracts/src/api.ts`
  do not read `inputPayloadRef` from the public request body
  if non-empty inline `inputPayload` cannot be persisted safely within this phase, reject it with an explicit client-facing validation error rather than exposing storage-ref semantics
- Out of scope
  Adding new canonical DTOs or editing `packages/contracts/src/api.ts`
  Removing legacy compatibility routes
  Changing auth claims, audit payloads, event payloads, or secret-manager behavior
  Building object-storage support for pipeline run input payload bodies
  Expanding collaboration beyond the existing project comment flow
- Files likely touched
  `packages/database/src/migrations/006_project_first_public_surface.sql`
  `apps/api/src/routes/sessions.ts`
  `apps/api/src/routes/collaboration.ts`
  `apps/ai-orchestration/src/routes/providers.ts`
  `apps/ai-orchestration/src/routes/roles.ts`
  `apps/ai-orchestration/src/routes/pipelines.ts`
  `apps/ai-orchestration/src/routes/runs.ts`
  `apps/ai-orchestration/src/dag-validator.ts`
  `apps/ai-orchestration/src/dag-validator.test.ts`
- Production-complete acceptance criteria
  `006_project_first_public_surface.sql` uses the real current pipeline table name and preserves the intended uniqueness behavior for the current schema.
  None of the canonical list routes named above return a `meta` envelope after this phase.
  Provider create and update reject duplicate active names for the same owner with a deterministic `409`.
  Provider secret rotation accepts `newCredential`.
  Canonical role creation authorizes provider ownership by user id, not by workspace match.
  Canonical pipeline create and update reject cross-project role references.
  Canonical run creation no longer consumes client-supplied `inputPayloadRef`.
- Risk points
  Pagination-shape changes must move together across sessions, comments, roles, pipelines, and runs or shared clients will remain split-brained.
  The migration correction must not assume a schema rewrite outside `006`.
  Provider uniqueness checks must not require destructive cleanup of legacy rows.
- Meaning-change check
  This work only finishes an already-decided public-surface migration. It does not change product meaning, tenancy meaning, or route strategy.
- ADR/doc check
  Must remain consistent with ADR 011 preview posture, ADR 012 client parity, and ADR 013 thin-workspace migration.
  No doc or ADR edits belong in this phase.
- Final state: `Can implement now`

### Workstream B — Hosted web active-surface cleanup

- Goal
  Finish the remaining active hosted web cleanup so the live web surface is project-first in copy, routing, and client-shape usage without reopening unrelated legacy files.
- In scope
  Change `apps/web/src/app/(dashboard)/dashboard/page.tsx` so `/dashboard` redirects to `/projects`.
  Make these remaining legacy workspace project files redirect-only implementations instead of leaving old UI bodies in place:
  `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/page.tsx`
  `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/editor/page.tsx`
  Remove remaining workspace-first copy and links from active hosted web surfaces that are already canonical:
  `apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx`
  `apps/web/src/app/(dashboard)/settings/page.tsx`
  `apps/web/src/app/(dashboard)/settings/providers/page.tsx`
  Update the active hosted web API client, hooks, and active components to consume public view DTOs from `packages/contracts/src/api.ts` rather than internal entity types that expose removed public fields.
  This includes the active project, session, provider, role, pipeline, and run flows currently rooted in:
  `apps/web/src/lib/api-client.ts`
  `apps/web/src/hooks/use-projects.ts`
  `apps/web/src/hooks/use-pipeline-runs.ts`
  `apps/web/src/components/sessions/session-card.tsx`
  `apps/web/src/components/ai/pipeline-run-card.tsx`
  `apps/web/src/app/(dashboard)/settings/providers/page.tsx`
  `apps/web/src/app/(dashboard)/projects/[projectId]/ai/roles/page.tsx`
  and any directly adjacent active pages listed in the allowlist if compile follow-through is required.
  Remove host and port rendering from active session UI.
  In the active project editor, stop deriving preview URLs from `session.workerHost` and `session.hostPort`.
  Use preview-binding semantics only.
  Do not change gateway or auth transport in this phase.
  If authenticated iframe embedding is not safely achievable inside the allowlist, render an explicit blocked or unavailable hosted-preview state instead of exposing worker topology or telling the user to expose a raw port.
  Update `apps/web/src/components/editor/preview-frame.tsx` copy accordingly.
- Out of scope
  Redesigning the hosted web UI
  Changing gateway behavior, auth middleware, or preview transport
  Refactoring dead legacy workspace hooks, contexts, or inactive components not named in this packet
  Reopening already-landed project list, settings redirect, or legacy settings redirect work
- Files likely touched
  `apps/web/src/app/(dashboard)/dashboard/page.tsx`
  `apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx`
  `apps/web/src/app/(dashboard)/projects/[projectId]/editor/page.tsx`
  `apps/web/src/app/(dashboard)/projects/[projectId]/ai/page.tsx` if compile follow-through is required
  `apps/web/src/app/(dashboard)/projects/[projectId]/ai/roles/page.tsx`
  `apps/web/src/app/(dashboard)/projects/[projectId]/ai/pipelines/[pipelineId]/page.tsx` if compile follow-through is required
  `apps/web/src/app/(dashboard)/settings/page.tsx`
  `apps/web/src/app/(dashboard)/settings/providers/page.tsx`
  `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/page.tsx`
  `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/editor/page.tsx`
  `apps/web/src/lib/api-client.ts`
  `apps/web/src/hooks/use-projects.ts`
  `apps/web/src/hooks/use-pipeline-runs.ts`
  `apps/web/src/components/sessions/session-card.tsx`
  `apps/web/src/components/ai/pipeline-run-card.tsx`
  `apps/web/src/components/editor/preview-frame.tsx`
- Production-complete acceptance criteria
  `/dashboard` redirects to `/projects`.
  The two remaining legacy workspace project pages above are redirect-only and do not render old workspace UI.
  No active page under `/projects/**` or `/settings/**` shows workspace-first copy or links back to `/workspaces`.
  No active hosted web file in scope depends on public `workspaceId`, `workerHost`, or `hostPort` fields.
  Session cards no longer render host or port metadata.
  The active project editor no longer constructs direct worker URLs from session data.
  The hosted web preview panel either uses preview-binding semantics safely or shows an explicit blocked or unavailable state without leaking worker topology.
- Risk points
  Authenticated gateway preview embedding is constrained by the current bearer-header auth model; do not paper over that by reintroducing direct worker URLs.
  Redirect-only legacy pages must not briefly mount old UI.
  Type migration in hooks and API wrappers may require small follow-through edits in active AI pages; keep those edits narrow.
- Meaning-change check
  This does not introduce a new information architecture. It only finishes the already-active project-first hosted web surface.
- ADR/doc check
  Must preserve the hosted web surface as primary and first-class.
  Must not change preview architecture or auth architecture.
- Final state: `Can implement now`

### Workstream C — iOS shared-flow completion

- Goal
  Finish the remaining iOS project-first shared-flow migration from the current baseline so the app shell and decoding model match the canonical project, session, preview, and comment surface.
- In scope
  Update `apps/mobile-ios/Sources/App/ContentView.swift` so the authenticated app enters the project list screen, not a workspace list intermediary.
  Rewrite the current `apps/mobile-ios/Sources/App/WorkspacesView.swift` implementation in place if convenient, but make it project-first:
  fetch projects directly
  render projects directly
  navigate directly to `ProjectDetailView`
  remove workspace list UI and workspace-first copy
  Update `apps/mobile-ios/Sources/App/Models.swift` so shared-flow models match the canonical public shapes currently already defined in `packages/contracts/src/api.ts`:
  `PaginatedResponse<T>` uses top-level `nextCursor` and `hasMore`
  `Project` omits `workspaceId`
  `Session` omits `workspaceId` and other removed public-only assumptions
  `PreviewRouteBinding` omits `workspaceId`
  keep decoder behavior tolerant of unknown extra fields
  Update `apps/mobile-ios/Tests/UDDCompanionTests/ProjectFirstContractDecodingTests.swift` so it validates representative canonical payloads for:
  project decoding
  session decoding
  preview binding decoding
  provider config view decoding
  top-level paginated response decoding for shared project-first list routes
  Update `apps/mobile-ios/Sources/App/APIClient.swift` only if required for minimal follow-through after the project-list shell and top-level pagination changes.
- Out of scope
  New iOS provider-management UI
  New iOS AI role or pipeline-management UI
  AppConfig changes
  Android changes
  Gateway or auth-transport changes
- Files likely touched
  `apps/mobile-ios/Sources/App/ContentView.swift`
  `apps/mobile-ios/Sources/App/WorkspacesView.swift`
  `apps/mobile-ios/Sources/App/APIClient.swift` if minimal follow-through is required
  `apps/mobile-ios/Sources/App/Models.swift`
  `apps/mobile-ios/Sources/App/ProjectDetailView.swift` if compile follow-through is required
  `apps/mobile-ios/Sources/App/RunsView.swift` if compile follow-through is required
  `apps/mobile-ios/Sources/App/PreviewView.swift` if compile follow-through is required
  `apps/mobile-ios/Sources/App/CommentsView.swift` if compile follow-through is required
  `apps/mobile-ios/Tests/UDDCompanionTests/ProjectFirstContractDecodingTests.swift`
- Production-complete acceptance criteria
  The active iOS app enters through a project list.
  No active iOS shared-flow model exposes `workspaceId` or expects `meta` pagination.
  Existing project detail, runs, comments, and preview screens continue to compile against the updated shared-flow models.
  The decoding test file validates the canonical shapes rather than workspace-tolerant fallback shapes.
- Risk points
  The local environment may not have a Swift toolchain; the limitation must be reported exactly if tests cannot run.
  Do not broaden iOS work into unrelated app restructuring.
  Keep the file-path surface stable unless compile follow-through makes a narrow edit necessary.
- Meaning-change check
  This finishes already-decided client parity work. It does not add new iOS-only product scope.
- ADR/doc check
  Must preserve web and iOS as first-class client surfaces under ADR 012.
- Final state: `Can implement now`

## Allowed files to change

Only the files below may be created or modified in this replacement Phase 2:

Backend:
- `packages/database/src/migrations/006_project_first_public_surface.sql`
- `apps/api/src/routes/sessions.ts`
- `apps/api/src/routes/collaboration.ts`
- `apps/ai-orchestration/src/routes/providers.ts`
- `apps/ai-orchestration/src/routes/roles.ts`
- `apps/ai-orchestration/src/routes/pipelines.ts`
- `apps/ai-orchestration/src/routes/runs.ts`
- `apps/ai-orchestration/src/dag-validator.ts`
- `apps/ai-orchestration/src/dag-validator.test.ts`

Hosted web:
- `apps/web/src/app/(dashboard)/dashboard/page.tsx`
- `apps/web/src/app/(dashboard)/projects/[projectId]/page.tsx`
- `apps/web/src/app/(dashboard)/projects/[projectId]/editor/page.tsx`
- `apps/web/src/app/(dashboard)/projects/[projectId]/ai/page.tsx` if compile follow-through is required
- `apps/web/src/app/(dashboard)/projects/[projectId]/ai/roles/page.tsx`
- `apps/web/src/app/(dashboard)/projects/[projectId]/ai/pipelines/[pipelineId]/page.tsx` if compile follow-through is required
- `apps/web/src/app/(dashboard)/settings/page.tsx`
- `apps/web/src/app/(dashboard)/settings/providers/page.tsx`
- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/page.tsx`
- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/projects/[projectId]/editor/page.tsx`
- `apps/web/src/lib/api-client.ts`
- `apps/web/src/hooks/use-projects.ts`
- `apps/web/src/hooks/use-pipeline-runs.ts`
- `apps/web/src/components/sessions/session-card.tsx`
- `apps/web/src/components/ai/pipeline-run-card.tsx`
- `apps/web/src/components/editor/preview-frame.tsx`

iOS:
- `apps/mobile-ios/Sources/App/ContentView.swift`
- `apps/mobile-ios/Sources/App/WorkspacesView.swift`
- `apps/mobile-ios/Sources/App/APIClient.swift` if minimal follow-through is required
- `apps/mobile-ios/Sources/App/Models.swift`
- `apps/mobile-ios/Sources/App/ProjectDetailView.swift` if compile follow-through is required
- `apps/mobile-ios/Sources/App/RunsView.swift` if compile follow-through is required
- `apps/mobile-ios/Sources/App/PreviewView.swift` if compile follow-through is required
- `apps/mobile-ios/Sources/App/CommentsView.swift` if compile follow-through is required
- `apps/mobile-ios/Tests/UDDCompanionTests/ProjectFirstContractDecodingTests.swift`

## Forbidden files to change

Any file not listed in the allowlist above is out of scope for this replacement Phase 2.

The following paths are explicitly forbidden because reopening them would broaden or restart already-landed work:

- `AGENTS.md`
- `docs/**`
- `prompt-pack/**`
- `.github/**`
- `infra/**`
- `packages/contracts/**`
- `apps/api/src/routes/index.ts`
- `apps/api/src/routes/projects.ts`
- `apps/api/src/routes/previews.ts`
- `apps/api/src/routes/public-view-mappers.ts`
- `apps/ai-orchestration/src/context.ts`
- `apps/ai-orchestration/src/routes/public-view-mappers.ts`
- `apps/gateway/**`
- `packages/auth/**`
- `packages/config/**`
- `packages/events/**`
- `packages/adapters/**`
- `apps/web/src/app/(dashboard)/projects/page.tsx`
- `apps/web/src/hooks/use-workspaces.ts`
- `apps/web/src/contexts/workspace-context.tsx`
- `apps/web/src/components/layout/workspace-sidebar.tsx`
- `apps/web/src/components/projects/project-card.tsx`
- `apps/web/src/app/(dashboard)/workspaces/page.tsx`
- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/layout.tsx`
- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/page.tsx`
- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/ai/**`
- `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/settings/**`
- `apps/mobile-ios/Package.swift`
- `apps/mobile-ios/Sources/App/AppConfig.swift`
- `apps/mobile-ios/Sources/App/AuthManager.swift`
- `apps/mobile-ios/Sources/App/LoginView.swift`
- `apps/mobile-ios/Sources/App/SettingsView.swift`
- `apps/mobile-android/**`

## Cross-workstream rules

- Treat the current working tree as the baseline. Do not reopen already-landed original Phase 2 work outside the allowlist.
- `packages/contracts/src/api.ts` is already the public contract authority for this phase. Adapt code to it; do not edit it.
- Internal storage, JWT claims, audits, and events may continue to use `workspaceId`. Public routes, active hosted web flows, and active iOS shared-flow models may not.
- Do not add new canonical routes, new public DTOs, or new migration numbers in this phase.
- Do not remove legacy compatibility routes or legacy workspace storage. Thin-workspace remains the internal model.
- Shared project, session, preview, and comment flows must stay aligned across backend, hosted web, and iOS.
- Do not change preview gateway behavior or auth transport in this phase.
- If hosted web preview cannot safely embed the authenticated gateway route inside the allowlist, use an explicit blocked or unavailable state instead of leaking worker topology or inventing a new auth path.
- Do not reintroduce `meta` pagination for any active shared-flow list route touched in this phase.
- Do not expose client-visible storage refs for pipeline run input payloads.
- Collaboration remains dormant and non-core. Only the existing project comment contract flow is in scope here.

## Accessibility and fallback requirements

- Redirect-only legacy pages must use redirect behavior that does not briefly render old workspace UI.
- Active hosted web pages touched in this phase must preserve semantic DOM controls, visible focus states, keyboard reachability, and existing loading, empty, blocked, degraded, and error-state treatment.
- The hosted web preview panel must not instruct the user to expose a raw port or reveal worker host details.
- If hosted web preview cannot be safely embedded under current auth constraints, the blocked or unavailable state must say so plainly and remain fully navigable.
- The provider settings page must keep accessible labels, validation copy, and non-color-only state indication.
- iOS empty, loading, and failure states must use project-first copy.
- iOS decoding must remain tolerant of extra unknown JSON fields from compatibility surfaces.

## UI material-system requirements if relevant

- Hosted web UI is touched, so preserve the existing DOM-first hosted surface.
- Do not redesign the visual system.
- Do not change shader, canvas, or WebGL architecture.
- Do not flatten the hosted web surface into generic template styling.
- Keep changes narrowly focused on routing, copy, type usage, preview-state behavior, and scoping semantics.

## Evidence Gemini must return

- Exact list of changed files.
- Exact list of canonical list routes changed from `meta` pagination to top-level `nextCursor` and `hasMore`.
- Exact confirmation that `006_project_first_public_surface.sql` now targets the real current pipeline table.
- Exact confirmation of provider-route fixes: duplicate-name handling behavior and `newCredential` handling.
- Exact confirmation of project-scoped AI fixes: provider ownership rule for role creation, project-scoped DAG validation, and run-create request handling.
- Exact list of active hosted web files switched from internal entity types to public view DTO usage.
- Exact list of hosted web redirects or redirect-only legacy files changed in this phase.
- Exact description of hosted web preview behavior after the phase, including whether it renders a gateway preview or an explicit blocked or unavailable state.
- Exact confirmation that no active hosted web file or active iOS shared-flow model in scope still exposes `workspaceId`, `workerHost`, or `hostPort`.
- Exact description of iOS shell changes and whether the workspace intermediary was removed.
- Command output summary for:
  `pnpm typecheck`
  `pnpm test`
  `pnpm build`
  `swift test --package-path apps/mobile-ios` if available
- If any command was not run or could not run, the exact reason.
- Any deliberate legacy shims or known limitations intentionally left after this phase, with the reason they remain.

## Stop conditions

- Stop immediately if implementation requires modifying any file outside the allowlist.
- Stop immediately if the only workable fix would require editing `packages/contracts/**`, adding a new public DTO, or changing an already-landed canonical route path.
- Stop immediately if the migration correction would require editing pre-`006` SQL migrations or performing destructive data cleanup.
- Stop immediately if project-scoped validation would require guessing project assignments for legacy rows that still have null project linkage.
- Stop immediately if the only way to complete hosted web preview would require changing `apps/gateway/**`, `packages/auth/**`, or canonical docs instead of using the allowed-file blocked or unavailable state.
- Stop immediately if an active hosted web or iOS flow would need to re-expose `workspaceId`, `workerHost`, `hostPort`, or `meta` pagination to pass.
- Stop immediately if completing the iOS migration would require unrelated app-shell restructuring outside the allowlist.
- Stop immediately if a change would alter product meaning, preview architecture, auth architecture, or the thin-workspace migration strategy and therefore require doc or ADR updates first.

## Final instruction
Treat the current repo state as the new Phase 2 baseline. Implement only the unresolved work defined above, keep the scope narrow, and do not reopen already-landed work.

Implement this phase packet exactly.
