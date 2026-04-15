# Codex Run Report

## Task

Implement the confirmed active public-surface drift remediation from the completed audit. 13 files across 4 tiers (A–D), removing workspace-scoped routes, dead hooks/contexts, and internal-only field leaks from the web client. Safety rules: verify imports before deleting, prefer deprecation over hard removal for contract DTOs.

## Canonical inputs consulted

- `docs/adr/008-hosted-execution-canonical.md` — Hosted execution is canonical; direct worker URLs must not be exposed on public web surfaces.
- `docs/adr/011-hosted-preview-default.md` — Preview uses gateway-proxied preview bindings, not direct `workerHost:hostPort` URLs.
- `docs/adr/013-thin-workspace-migration-strategy.md` — Workspace is thin identity scope; public API surface is project-first.
- `packages/contracts/src/api.ts` — `SessionView` DTO (public, without `workerHost`/`hostPort`/`workspaceId`/`version`).
- `packages/contracts/src/entities.ts` — `Session` entity (internal, includes `workerHost`/`hostPort`).
- Repo memory (`/memories/repo/udd-app-audit.md`) — Complete audit results with 13-file remediation scope.

## GitNexus analysis

Import/caller verification performed for all 13 scope files before any edits:

| File                                          | Active importers                                 | Decision                                     |
| --------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| `use-workspaces.ts`                           | 0                                                | Safe to delete                               |
| `workspace-context.tsx`                       | 1 (`providers.tsx`)                              | Remove from provider tree first, then delete |
| `settings-nav.tsx` (workspace path)           | 0                                                | Safe to delete                               |
| `api-client.ts` workspace methods             | 0 callers                                        | Safe to remove methods                       |
| `session-card.tsx` → `Session` type           | Internal entity leak                             | Switch to `SessionView`                      |
| `use-projects.ts` → `Session` type            | Internal entity leak                             | Switch to `SessionView`                      |
| `editor/page.tsx` → `workerHost:hostPort` URL | Direct worker URL leak                           | Remove URL, show empty state                 |
| `routes/projects.ts` workspace handlers       | Only self-mount                                  | Safe to remove handlers                      |
| `routes/index.ts` AI prefixes                 | Active proxy array                               | Remove 4 workspace-scoped prefixes           |
| `routes/workspaces.ts`                        | Mounted by `index.ts`                            | Deprecate, don't remove (provisioning)       |
| 4× AI orchestration route files               | Mixed                                            | Remove deprecated blocks, keep canonical     |
| 4× Workspace DTOs in `api.ts`                 | `CreateWorkspaceRequest` imported by dead method | Add `@deprecated` tags                       |

## Changes made

### Tier A — Web client (8 edits)

1. **`apps/web/src/lib/api-client.ts`** — Removed `CreateWorkspaceRequest`, `Workspace` imports; removed `listWorkspaces()`, `createWorkspace()`, `getWorkspace()` methods.
2. **`apps/web/src/hooks/use-workspaces.ts`** — Deleted (zero importers).
3. **`apps/web/src/contexts/workspace-context.tsx`** — Deleted (sole consumer removed from `providers.tsx` first).
4. **`apps/web/src/components/providers.tsx`** — Removed `WorkspaceProvider` import and `<WorkspaceProvider>` wrapper from component tree.
5. **`apps/web/src/components/sessions/session-card.tsx`** — Changed `Session` → `SessionView` import; removed `Server` icon import; removed `workerHost`/`hostPort` MetaRow display; added `SessionState` import with type cast for badge.
6. **`apps/web/src/hooks/use-projects.ts`** — Changed `Session` → `SessionView` import; updated SWR generic type.
7. **`apps/web/src/app/(dashboard)/projects/[projectId]/editor/page.tsx`** — Replaced direct `workerHost:hostPort` preview URL construction with bare `<PreviewFrame />` (shows "No preview available" empty state); added `SessionState` import with type cast for badge.
8. **`apps/web/src/app/(dashboard)/workspaces/[workspaceId]/settings/settings-nav.tsx`** — Deleted (zero importers; separate active `SettingsNav` exists at dashboard settings path).

### Tier B — API backend (3 edits)

9. **`apps/api/src/routes/projects.ts`** — Removed both deprecated `/workspaces/:id/projects` GET and POST handlers (~90 lines).
10. **`apps/api/src/routes/index.ts`** — Removed 4 workspace-scoped AI proxy prefixes from `AI_PREFIXES` array.
11. **`apps/api/src/routes/workspaces.ts`** — DEPRECATED, NOT REMOVED. Added deprecation comment block; added `Deprecation: true` headers to all 5 handlers; changed section comments to include "DEPRECATED". Retained for internal workspace provisioning (canonical `POST /projects` auto-resolves home workspace).

### Tier C — AI orchestration (4 edits)

12. **`apps/ai-orchestration/src/routes/roles.ts`** — Removed all 5 deprecated `/workspaces/:id/ai/roles/*` handlers (~195 lines); removed unused `AgentRole` import; kept `assertMember` (used by canonical routes).
13. **`apps/ai-orchestration/src/routes/pipelines.ts`** — Removed all 5 deprecated `/workspaces/:id/ai/pipelines/*` handlers (~215 lines); removed unused `PipelineDefinition` import; kept `assertMember`, `validateDag`.
14. **`apps/ai-orchestration/src/routes/runs.ts`** — Removed all 4 deprecated `/workspaces/:id/ai/runs/*` handlers (~195 lines); kept `assertMember`, `PlatformEvent` (both used by canonical routes).
15. **`apps/ai-orchestration/src/routes/providers.ts`** — Removed all 6 deprecated `/workspaces/:id/ai/providers/*` handlers (~300 lines); removed `assertMember` (only used by deprecated), `requirePermission` import, `PlatformEvent` import; kept `toView`/`mapProviderConfigView`, `ProviderConfig`.

### Tier D — Contract deprecation (1 edit)

16. **`packages/contracts/src/api.ts`** — Added `@deprecated` JSDoc tags to all 4 workspace DTOs (`CreateWorkspaceRequest`, `UpdateWorkspaceRequest`, `InviteMemberRequest`, `UpdateMemberRoleRequest`) with reference to ADR 013.

### Typecheck fix-ups (3 edits, caused by Session → SessionView migration)

17. **`apps/api/src/routes/workspaces.ts`** — Fixed invalid em-dash character (`—`) in comment that broke TypeScript parser.
18. **`apps/web/src/components/sessions/session-card.tsx`** — Added `as SessionState` cast for `session.state` (SessionView.state is `string`, SessionStatusBadge expects `SessionState`).
19. **`apps/web/src/app/(dashboard)/projects/[projectId]/editor/page.tsx`** — Added `as SessionState` cast for `activeSession.state`.

## Verification

| Gate                | Result                                                      |
| ------------------- | ----------------------------------------------------------- |
| `pnpm typecheck`    | ✅ PASS — 26/26 tasks, 0 errors                             |
| `pnpm test`         | ✅ PASS — 21/21 tasks, all test suites green (67 tests)     |
| `pnpm lint` (scope) | ⚠️ Pre-existing errors only — no new lint errors introduced |

### Blast radius check

| Check                                 | Result                                    |
| ------------------------------------- | ----------------------------------------- |
| Imports of 3 deleted files            | ✅ Zero remaining imports                 |
| `Session` entity imports on web       | ✅ None — all switched to `SessionView`   |
| `workerHost`/`hostPort` on web source | ✅ None (only stale `.next/` build cache) |
| Workspace-scoped AI routes in source  | ✅ None (only stale `dist/` artifacts)    |
| `WorkspaceProvider` references        | ✅ None                                   |

## Review

### Intentional decisions

- **`workspaces.ts` deprecated, not removed**: The workspace CRUD routes are retained with `Deprecation: true` headers. `POST /workspaces` may be needed for initial workspace provisioning during user onboarding until the internal provisioning path is fully consolidated.
- **Editor preview shows empty state**: Per ADR 011 and repo memory guidance, the hosted web preview iframe cannot attach bearer auth headers. The `<PreviewFrame />` now shows "No preview available" until gateway preview binding transport is implemented.
- **`SessionState` casts**: `SessionView.state` is typed as `string` (deliberate decoupling in the DTO). The casts at badge call sites are safe — the API only returns valid `SessionState` values.
- **11 workspace route stubs remain**: The workspace-scoped route pages under `apps/web/src/app/(dashboard)/workspaces/[workspaceId]/` are dead legacy redirect stubs. Per the audit, these are classified as "dead legacy redirect stubs" and are out of scope for this remediation.

### Remaining items (out of scope)

- Rebuild `apps/ai-orchestration/` and `apps/web/` to clear stale build artifacts from `dist/` and `.next/`.
- Future: Remove workspace route stubs once redirect period expires.
- Future: Implement gateway preview binding transport so editor preview can show live content.
- Future: Tighten `SessionView.state` type from `string` to `SessionState` in the DTO itself.

## Final status

**COMPLETE** — All 4 tiers implemented. 16 source edits + 3 typecheck fix-ups. 3 files deleted. Typecheck green, tests green, no new lint errors. Blast radius clean.
