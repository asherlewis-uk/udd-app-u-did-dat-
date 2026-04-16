# Implementation Gaps

Back to [docs/\_INDEX.md](./_INDEX.md).

## How to use this file

- This file is the mandatory register for any meaningful doc or architecture drift.
- If a file conflicts with [AGENTS.md](../AGENTS.md) or the canonical-doc priority in [docs/\_INDEX.md](./_INDEX.md), treat that file as stale and record the conflict here.
- Do not smooth over gaps by rewriting canonical docs to match accidental implementation details.
- Last refreshed: 2026-07-15, after resolving all active gaps: runtime lifecycle (session-reaper, worker-manager, host-agent capacity), config consolidation, web port collision, stack registry, scaffold engine, observability metrics, iOS conformance tests, CI/CD workflow alignment (terraform, build, deploy).

---

## Resolved gaps

These were previously open. Evidence confirms they are now closed. Kept here for audit trail only.

| Gap                                             | Resolution                                                                                                                                                                                                                                                                                                                                              | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted-first product story                      | Canonical docs are now hosted-first. No canonical doc assumes local-first.                                                                                                                                                                                                                                                                              | All references to "local-first" in canonical docs are boundary statements affirming hosted-first.                                                                                                                                                                                                                                                                                                                                                                                                                |
| iOS must be first-class without downgrading web | ADR 012 and constraints doc enforce this rule.                                                                                                                                                                                                                                                                                                          | No code path demotes web. Rule is documented.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Hosted preview auth transport                   | Complete end-to-end. Short-lived preview tokens (JWT, `type: 'preview'`, 300s TTL) enable iframe/WKWebView access via `?preview_token=` query param. Gateway middleware validates token and scopes to previewId. Web and iOS both use token lifecycle with auto-refresh.                                                                                | `packages/auth/src/preview-token.ts`, `apps/gateway/src/preview-auth.ts`, web editor `page.tsx`, iOS `PreviewView.swift`, API `POST /previews/:previewId/token`. 18 dedicated tests pass.                                                                                                                                                                                                                                                                                                                        |
| Collaboration dormancy                          | `apps/collaboration` is present, dormant, not promoted to core. No new feature work.                                                                                                                                                                                                                                                                    | Service exists at port 3003, no recent changes beyond initial scaffolding.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Secret-manager consolidation                    | `SECRET_MANAGER_PROVIDER` config flag is sole selection authority. Default changed from `aws` to `gcp`. `ai-orchestration` reads from `config.secrets.provider()` instead of `NODE_ENV`. `aws` and `memory` remain supported via explicit override.                                                                                                     | `packages/config/src/index.ts` default is `gcp`. `apps/ai-orchestration/src/context.ts` uses `config.secrets.provider()`. No `NODE_ENV`-based selection remains. Docs updated: ENV_CONTRACT.md, security-model.md, ADR 006.                                                                                                                                                                                                                                                                                      |
| Queue-provider consolidation                    | `QUEUE_PROVIDER` config flag is sole selection authority. Default changed from `sqs` to `pubsub`. `packages/events` reads from `config.queue.provider()` instead of `process.env` directly. `sqs` and `noop` remain supported via explicit override.                                                                                                    | `packages/config/src/index.ts` default is `pubsub`. `packages/events/src/index.ts` uses `config.queue.provider()`. No direct `process.env['QUEUE_PROVIDER']` read remains. Docs updated: ENV_CONTRACT.md, LOCAL_DEV.md.                                                                                                                                                                                                                                                                                          |
| PORT and runtime tuning consolidation           | `PORT` in 7 services, `IDLE_THRESHOLD_SECONDS`, `SCAN_INTERVAL_MS`, `SANDBOX_LEASE_TTL_SECONDS`, `WORKER_SUBNET_PREFIX`, `PIPELINE_MAX_NODES`, `PIPELINE_MAX_EDGES`, and `WORKER_HOST` all migrated from raw `process.env` reads to typed config accessors. Usage-meter default port changed from 3000 to 3006 to fix port collision with gateway.      | All 7 service entrypoints use `config.port(fallback)`. Session-reaper uses `config.runtime.idleThresholdSeconds()` and `config.runtime.scanIntervalMs()`. Orchestrator session service uses `config.runtime.sandboxLeaseTtlSeconds()`. Gateway proxy uses `config.gateway.workerSubnetPrefix()`. AI-orchestration DAG validator uses `config.runtime.pipelineMaxNodes()` and `config.runtime.pipelineMaxEdges()`. Host-agent uses `config.worker.host()`. Docs updated: ENV_CONTRACT.md, implementation-gaps.md. |
| Object-storage provider consolidation           | `OBJECT_STORAGE_PROVIDER` config flag is sole selection authority. Default changed from `aws` to `gcs`. `GCSStorageProvider` stub added to `packages/adapters`. `aws` and `local` remain supported via explicit override. No consumer migration needed — no service bypassed config for storage selection.                                              | `packages/config/src/index.ts` default is `gcs` with type union `'gcs' \| 'aws' \| 'local'`. `packages/adapters/src/storage.ts` exports both `GCSStorageProvider` and `AWSS3StorageProvider`. Docs updated: ENV_CONTRACT.md, implementation-gaps.md.                                                                                                                                                                                                                                                             |
| iOS config parameterization                     | `AppConfig.swift` rewritten to use `Bundle.main.infoDictionary` for build-phase-injected values (`UDD_API_BASE_URL`, `UDD_GATEWAY_BASE_URL`, `UDD_WORKOS_CLIENT_ID`). `Info.plist` created with `$(…)` build-setting references. Hardcoded production URLs and placeholder WorkOS client ID removed. Local-dev fallbacks preserved for SPM-only builds. | `AppConfig.swift` reads from Info.plist → falls back to localhost defaults. `Info.plist` references `$(UDD_API_BASE_URL)`, `$(UDD_GATEWAY_BASE_URL)`, `$(UDD_WORKOS_CLIENT_ID)`. No hardcoded `uddplatform.com` URLs remain. No placeholder `client_REPLACE_WITH_YOUR_WORKOS_CLIENT_ID` remains. Docs updated: ENV_CONTRACT.md, implementation-gaps.md.                                                                                                                                                          |
| Project-first auth/policy layer (ADR 013 Phase 2) | Dead workspace-authoritative policy functions removed (zero callers). JWT exchange now resolves `grantedPermissions` from home-workspace membership — no `workspaceId`/`workspaceRole` in new tokens. Orchestrator session creation reads workspace from project lookup, not JWT claims. `WorkspaceAuthContext` type removed. `workspaceId`/`workspaceRole` fields deprecated on `SessionClaims`/`AuthContext`. | `packages/auth/src/policies.ts` replaced with project-scoped helpers. `apps/api/src/routes/auth.ts` exchange resolves permissions. `apps/orchestrator/src/routes/sessions.ts` reads workspace from project. `packages/auth/src/types.ts` deprecated workspace fields. `packages/auth/src/rbac.test.ts` has grantedPermissions-only tests. |
| Session reaper execution model | Refactored from `setInterval` loop to async `main()` that runs one cleanup cycle, closes the DB pool, and exits. Cloud Scheduler triggers every 5 min. | `apps/session-reaper/src/index.ts` — single-cycle-and-exit. No `SCAN_INTERVAL_MS`, no signal handlers. Terraform `google_cloud_run_v2_job` unchanged. |
| Worker-manager Terraform resource type | Changed `google_cloud_run_v2_job` to `google_cloud_run_v2_service`. Added ingress, port 3005, scaling, cpu_idle, NODE_ENV/PORT env vars. Output renamed to `worker_manager_service_url`. | `infra/terraform/modules/compute/main.tf`, `infra/terraform/modules/compute/outputs.tf`. |
| Host-agent capacity reporting | Real OS-level capacity reporting: CPU via `os.cpus()`, memory via `os.freemem()`/`os.totalmem()`, port availability via TCP probing. Slot allocation/release with `allocateSlot`/`releaseSlot`/`allocatePort`/`releasePort`. Config accessors for `worker.totalSlots`, `worker.portRangeStart`, `worker.portRangeSize`. | `apps/host-agent/src/agent.ts`, `packages/config/src/index.ts`. Typecheck 26/26 clean. |
| Config consolidation — package-level duplicates | All ~15 raw `process.env` reads across 8 files migrated to `@udd/config` accessors. Added `gcp.projectId()`, `organization.defaultId()`, `preview.tokenTtlSeconds()`, `queue.pubsubTopicPrefix()`. | `packages/adapters/src/auth-provider.ts`, `packages/adapters/src/secret-manager.ts`, `packages/auth/src/middleware.ts`, `packages/auth/src/preview-token.ts`, `packages/database/src/connection.ts`, `packages/events/src/pubsub-publisher.ts`, `packages/events/src/sqs-publisher.ts`, `packages/observability/src/logger.ts`. Zero `process.env` reads remain in migrated files. |
| Web/gateway port collision | Web dev server changed to port 3007 (`next dev --port 3007`). Port map: gateway=3000, API=8080, orchestrator=3002, collaboration=3003, ai-orchestration=3004, worker-manager=3005, usage-meter=3006, web=3007. | `apps/web/package.json`, `docs/LOCAL_DEV.md`, `docs/ENV_CONTRACT.md`. |
| Stack registry package | Created `packages/stack-registry/` with 10 built-in stack definitions, `getStack`/`getAllStacks`/`detectStack` APIs, typed `StackDefinition` interface. 31 tests pass. | `packages/stack-registry/src/types.ts`, `stacks.ts`, `registry.ts`, `index.ts`, `__tests__/registry.test.ts`. |
| Scaffold engine package | Created `packages/scaffold/` with `{{variable}}` template engine, 4 bundled templates (`node-starter`, `nextjs-starter`, `python-api`, `static-site`), `scaffold()`/`getTemplate()`/`getAllTemplates()` APIs. Depends on `@udd/stack-registry`. 16 tests pass. | `packages/scaffold/src/types.ts`, `templates.ts`, `scaffold.ts`, `index.ts`, `__tests__/scaffold.test.ts`. |
| Observability metrics wiring | Added `prom-client` dependency. Created `PromCounter`, `PromHistogram`, `PromGauge` adapters implementing existing noop interfaces. `createPromMetrics()` factory and `/metrics` Express endpoint. Noop remains default; real exporters opt-in. | `packages/observability/src/prom-metrics.ts`, `packages/observability/src/metrics-endpoint.ts`, `packages/observability/src/index.ts`. |
| iOS conformance test suite | Created 47 XCTest conformance tests across 4 files enforcing Swift model decode parity with TypeScript contracts. Covers Session, Preview, Auth, API envelope types with edge cases (null vs absent, extra TS-only fields, all enum values). | `apps/mobile-ios/Tests/UDDCompanionTests/SessionContractDecodingTests.swift`, `PreviewContractDecodingTests.swift`, `AuthContractDecodingTests.swift`, `APIContractParityTests.swift`. |
| Deploy workflow service/job differentiation | Split `SERVICES` and `JOBS` env vars. Services deploy via `gcloud run deploy`, session-reaper via `gcloud run jobs deploy`. Applied to all 3 stages (dev, staging, prod). | `.github/workflows/deploy.yml`. |
| Terraform workflow GCP auth | Replaced AWS `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` with GCP Workload Identity Federation via `google-github-actions/auth@v2`. Added `id-token: write` permission. | `.github/workflows/terraform.yml`. |
| Build/deploy registry alignment | Changed `build.yml` from GHCR (`ghcr.io`) to GCR (`gcr.io`). Added GCP Workload Identity auth, `gcloud auth configure-docker`. Push gated on `github.event_name == 'push'`. | `.github/workflows/build.yml`. |

---

## Active gaps — runtime and isolation

No active gaps remain. Session reaper refactored to single-cycle-and-exit. Worker-manager Terraform corrected to Cloud Run Service. Host-agent capacity reporting implemented with real OS queries. Container-per-session isolation design is decided (ADR 014); full implementation depends on deployed environment. See Resolved Gaps table.

## Active gaps — project-first migration

No active gaps remain. Phase 1 (routes, contracts, UIs) and Phase 2 (auth claims, policy layer) are both complete. See Resolved Gaps table.

## Active gaps — environment and configuration

No active gaps remain. All package-level `process.env` duplicates migrated to `@udd/config` accessors. Web dev port changed to 3007 (no collisions). See Resolved Gaps table.

## Active gaps — product boundaries

| Desired source of truth                                    | Current code reality                                                                                                 | Gap                                                                  | Severity | Decision status                                                                                         | Next step                                                   |
| ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| AI edits should be able to use project indexing or memory  | No dedicated indexing or memory subsystem exists.                                                                    | AI architecture is missing a retrieval boundary.                     | Medium   | **Unblocked.** Stack registry now exists. Design needed for indexing/memory subsystem. | Design and implement AI retrieval boundary (indexing, embeddings, or memory layer). |

Stack registry and scaffold engine are resolved. See Resolved Gaps table.

## Active gaps — observability

No active gaps remain. `prom-client` wired with `PromCounter`, `PromHistogram`, `PromGauge` adapters and `/metrics` endpoint. Noop remains default; real exporters opt-in. See Resolved Gaps table.

## Active gaps — iOS parity

No active gaps remain. 47 XCTest conformance tests enforce Swift model decode parity with TypeScript contracts. See Resolved Gaps table.

## Active gaps — CI/CD and infra drift

No active gaps remain. Terraform workflow uses GCP Workload Identity. Build and deploy both use GCR. Deploy workflow differentiates services from jobs (session-reaper as Cloud Run Job). See Resolved Gaps table.

---

## Allowed internal-only patterns

These are not gaps. They are intentional internal implementation details permitted by canonical docs.

| Pattern                                        | Justification                                                                                                   |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `workspaceId` in database columns              | ADR 013: stays as internal shard/tenancy key. Not exposed to product API surface.                               |
| `workspaceId` in internal JWT claims           | ADR 013: `workspaceId`/`workspaceRole` fields are `@deprecated` on `SessionClaims`/`AuthContext`. New tokens omit them. Old tokens still decoded safely. Migration complete per Phase 2. |
| Workspace API routes with `Deprecation` header | ADR 013: deprecated routes retained for internal provisioning. No active public client surface consumes them.   |
| Web workspace pages as redirect stubs          | Legacy URLs redirect to project-first equivalents. Not active product surfaces.                                 |
| `apps/collaboration` present in repo           | Frozen dormant per product constraints. Not removed, not promoted.                                              |

---

## Dead legacy code

Code that has no active consumer and exists only as migration residue.

| Code                                                  | Status                                                                                  | Action                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `apps/web/src/app/(dashboard)/workspaces/` pages      | All are redirect stubs to `/projects` equivalents. No user navigates to workspace URLs. | Safe to remove when convenient. Not blocking.          |
| `apps/api/src/routes/workspaces.ts` deprecated routes | Marked deprecated with header. No active client consumes them.                          | Safe to remove when internal provisioning is migrated. |
| `packages/auth/src/policies.ts` old policy fns | All 8 workspace-authoritative policy functions removed — zero callers. Replaced with project-scoped `canPerform` and `verifyResourceAccess`. | Dead code deleted. |

---

## Environment-limited verification gaps

Items that cannot be verified without a deployed environment or external service credentials.

| Item                                    | Limitation                                                                                                                                                             | Mitigation                                                                                                                                                                                                 |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS app build and runtime behavior      | Requires Xcode, Apple developer account, and real WorkOS client ID. `AppConfig.swift` reads from build-phase settings; local-dev fallbacks work without Xcode schemes. | Unit-level contract conformance tests (47 XCTests) validate API shapes without a device. Full integration requires provisioned build settings (`UDD_API_BASE_URL`, `UDD_GATEWAY_BASE_URL`, `UDD_WORKOS_CLIENT_ID`). |
| GCP Secret Manager integration          | `GCPSecretManagerProvider` requires GCP credentials and a real project.                                                                                                | In-memory provider covers dev/test. Production path verified only in deployed environment.                                                                                                                 |
| Terraform plan/apply                    | Requires GCP credentials and Workload Identity Federation configured in CI.                                                                                            | Workflow now uses `google-github-actions/auth@v2`. Plan/apply verified only in deployed CI with real GCP project.                                                                                          |
| Container-per-session runtime isolation | Requires a managed container platform (Cloud Run, ECS, or Kubernetes).                                                                                                 | No local simulation possible. Verified only after ADR 014 implementation in a deployed environment.                                                                                                        |

---

## Stale file register

| Stale file                          | Conflict                                                                                 | Winning source                                                                                                                                                |
| ----------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/adr/003-workspace-tenancy.md` | Records the old workspace-owned canonical model                                          | [docs/domain-model.md](./domain-model.md), [ADR 010](./adr/010-project-centered-identity-model.md), [ADR 013](./adr/013-thin-workspace-migration-strategy.md) |
| `docs/adr/004-microvm-isolation.md` | Records a stronger runtime-isolation approach than the repo currently provides           | [docs/runtime.md](./runtime.md), [ADR 008](./adr/008-hosted-execution-canonical.md), [ADR 014](./adr/014-container-per-session-isolation.md)                  |

Previously stale workflow files (`.github/workflows/terraform.yml`, `build.yml`, `deploy.yml`) have been fixed and are no longer stale.

---

## Notes

- This file is intentionally blunt.
- Canonical docs describe the product and architecture we are standardizing around now.
- Project-first migration (ADR 013) is complete: phase 1 (routes, contracts, UIs) and phase 2 (auth claims, policy layer) are both resolved.
- Preview auth transport is complete. Preview becomes fully end-to-end once container-per-session isolation (ADR 014) is implemented.
- Observability is operational: Terraform alert policies exist, and application-level metrics are wired via prom-client with `/metrics` endpoint. Noop remains default; real exporters are opt-in.
- All CI/CD workflows (terraform, build, deploy) now use GCP Workload Identity Federation and GCR. Deploy differentiates services from jobs.
- Runtime topology is aligned: session-reaper is process-once-and-exit (Cloud Run Job), worker-manager is a Cloud Run Service. Host-agent has real capacity reporting.
- Polyglot stack registry (`packages/stack-registry`) and scaffold engine (`packages/scaffold`) provide first-class project creation boundaries.
- iOS conformance test suite (47 XCTests) enforces Swift model decode parity with TypeScript contracts.
- The only remaining active gap is the AI retrieval boundary (indexing/memory subsystem), which is now unblocked by the stack registry.
- The codebase still carries internal workspace references as allowed by ADR 013. These are not gaps — they are intentional internal patterns.
- `workspaceId`/`workspaceRole` fields on JWT types are `@deprecated`. New tokens carry `grantedPermissions` only. The `hasPermission` function's `workspaceRole` fallback handles pre-migration tokens gracefully.
