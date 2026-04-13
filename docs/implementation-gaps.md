# Implementation Gaps

Back to [docs/_INDEX.md](./_INDEX.md).

## How to use this file

- This file is the mandatory register for any meaningful doc or architecture drift.
- If a file conflicts with [AGENTS.md](../AGENTS.md) or the canonical-doc priority in [docs/_INDEX.md](./_INDEX.md), treat that file as stale and record the conflict here.
- Do not smooth over gaps by rewriting canonical docs to match accidental implementation details.

## Gap table

| Desired source of truth | Current code reality | Gap | User impact | Severity | Owner or next step |
|---|---|---|---|---|---|
| Solo-first, project-centered domain model | Schema, auth, API routes, web UI, and iOS API all use `Organization -> Workspace -> Project` | Canonical product model and implementation model diverge | High cognitive load, stale terminology, harder future simplification | High | Replace workspace-owned product semantics over time; keep canonical docs project-centered |
| Hosted-first product story | Older docs assumed local-first in several places before this reset | Canonical hosted-first story required a full doc rewrite | Confusing onboarding and architecture assumptions | Medium | Keep hosted-first docs authoritative; archive stale planning after replacements exist |
| Web and iOS are first-class client surfaces | Web is primary in code; iOS exists but still uses workspace-shaped APIs and hardcoded config | First-class status exists in product scope, but iOS is not yet equally operationally mature | Risk of web-only changes breaking iOS and vice versa | High | Enforce web+iOS compatibility gates in docs and ADRs |
| iOS must be first-class without downgrading web | No code path currently demotes web, but nothing in old docs prevented it | Needed an explicit rule in canonical docs and ADRs | Future planning could silently skew to one client surface | Medium | Keep the no-web-downgrade rule in constraints, ADRs, and quality gates |
| Hosted runtime is canonical and production-ready | Host-agent capacity reporting is stubbed and no real MicroVM provisioning exists | Runtime lifecycle exists, but isolation and capacity truth are incomplete | Session startup and safety assumptions are weaker than canonical docs require | High | Keep runtime docs honest and track isolation work explicitly |
| Worker-manager is a hosted runtime service | `apps/worker-manager` is an HTTP service, but Terraform models it as a Cloud Run Job | Infra and code disagree on service shape | Hosted runtime cannot be reasoned about cleanly from infra alone | High | Fix infra or code later; do not edit workflows or infra in this pass |
| Session reaper is a scheduled cleanup job | Code is a long-running interval loop; infra schedules it as a job | Execution model is split between service-style and job-style assumptions | Operators can misdiagnose stuck cleanup behavior | High | Keep runbooks explicit about the mismatch |
| Deploy workflow should match runtime topology | `.github/workflows/deploy.yml` deploys Cloud Run services for components Terraform models as jobs | Workflow and infra disagree | Release behavior can diverge from intended runtime shape | High | Logged only in docs for this pass |
| Terraform workflow should reflect repo infrastructure | `.github/workflows/terraform.yml` uses AWS credentials while Terraform is GCP-oriented | Workflow source of truth is stale | Misleading CI, broken plans, operator confusion | High | Logged only in docs for this pass |
| Build and deploy registries should agree | `.github/workflows/build.yml` assumes GHCR while deploy uses GCR | Container publishing story is inconsistent | Build artifacts and deployment assumptions diverge | Medium | Logged only in docs for this pass |
| Environment contract should be authoritative | `packages/config` covers some env vars, but services still read raw `process.env` for `PORT`, `IDLE_THRESHOLD_SECONDS`, `SCAN_INTERVAL_MS`, `SANDBOX_LEASE_TTL_SECONDS`, and others | Config contract is incomplete | Harder local setup, weaker operator confidence, hidden behavior | High | Keep [docs/ENV_CONTRACT.md](./ENV_CONTRACT.md) broader than typed config until code catches up |
| Secret-manager selection should follow a single explicit contract | Current code uses `NODE_ENV === 'production'` in `apps/ai-orchestration/src/context.ts`, while `packages/config` exposes `SECRET_MANAGER_PROVIDER` with AWS-oriented defaults | Secret-manager source of truth is split | High risk of operator misunderstanding | High | Canonical source stays in docs; implementation should converge later |
| Polyglot support should have a first-class stack boundary | Repo has no dedicated stack registry, detector, or adapter catalog | Polyglot story is real in product scope but not yet first-class in implementation | AI and scaffold behavior cannot be reliably stack-aware | High | Track as a core architecture gap |
| New project creation should pass through a scaffold engine | No first-class scaffold/template engine exists in runtime code | Idea-to-project flow is incomplete | Product cannot yet fully deliver the canonical create flow | High | Keep scaffold as a documented core boundary and implementation gap |
| AI edits should be able to use project indexing or memory | No dedicated indexing or memory subsystem exists | AI architecture is missing a key retrieval boundary | AI editing context is weaker than canonical docs expect | Medium | Document the boundary; do not fake implementation |
| Hosted preview should be stable and secure | Gateway preview path exists, but runtime isolation and route lifecycle still depend on incomplete runtime plumbing | Preview story is implemented only partially end-to-end | Users may see preview failures that look like product bugs | High | Keep runbooks and runtime docs explicit |
| Local development should be a supported path | `pnpm dev` starts multiple apps with overlapping default ports (`web`, `gateway`, `usage-meter`) | Local dev entrypoint is not clean | Friction for contributors and operators | Medium | Document targeted startup with explicit port overrides |
| First-class iOS surface should be easy to configure | `apps/mobile-ios/Sources/App/AppConfig.swift` hardcodes local and production URLs and contains a placeholder WorkOS client ID | iOS local and production configuration are not fully productized | High chance of broken local iOS validation | High | Keep local-dev docs explicit and treat config cleanup as follow-up work |
| Solo-first product should not make collaboration a product center | `apps/collaboration` and related APIs exist | Collaboration support exists, but it should remain optional in product docs | Scope creep and wrong architectural emphasis | Medium | Keep collaboration out of canonical product center |

## Stale file register

| Stale file | Conflict | Winning source |
|---|---|---|
| `docs/adr/003-workspace-tenancy.md` | Records the old workspace-owned canonical model | [docs/domain-model.md](./domain-model.md), [docs/adr/010-project-centered-identity-model.md](./adr/010-project-centered-identity-model.md) |
| `docs/adr/004-microvm-isolation.md` | Records a stronger runtime-isolation implementation than the repo currently provides | [docs/runtime.md](./runtime.md), [docs/adr/008-hosted-execution-canonical.md](./adr/008-hosted-execution-canonical.md) |
| `.github/workflows/terraform.yml` | Encodes AWS secrets for a GCP-oriented Terraform tree | [docs/architecture.md](./architecture.md), [docs/ENV_CONTRACT.md](./ENV_CONTRACT.md) |
| `.github/workflows/build.yml` | Encodes GHCR assumptions while deploy uses GCR | [docs/architecture.md](./architecture.md), this gap register |
| `.github/workflows/deploy.yml` | Deploys some components as services while Terraform models them as jobs | [docs/architecture.md](./architecture.md), [docs/service-catalog.md](./service-catalog.md) |

## Notes

- This file is intentionally blunt.
- Canonical docs describe the product and architecture we are standardizing around now.
- The codebase still carries older workspace-centric and partially incomplete hosted-runtime assumptions. Those remain implementation facts until code changes, but they do not override the canonical docs.
