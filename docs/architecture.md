# Architecture

Back to [docs/\_INDEX.md](./_INDEX.md).

## Canonical posture

This repo documents a **solo-first, hosted-first** product. The default user experience is the hosted product, reached through the web client and the iOS client. Web and iOS are both first-class surfaces. iOS does not replace or demote the hosted web surface.

The canonical architecture is organized around a single builder loop:

`idea -> open or create project -> AI-assisted changes -> run in hosted session -> preview in hosted surface -> optionally export or deploy elsewhere`

Local development exists to build and operate the product, and to validate stack behavior outside the hosted runtime. It is supported, but it is not the canonical product mode. See [docs/execution-modes.md](./execution-modes.md).

## Boundary model

| Module                        | Purpose                                                                                            | Repo reality                                                                          | Class    | Notes                                                                                                                                                          |
| ----------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell and UX              | Hosted user-facing shell for auth, projects, sessions, preview, AI surfaces                        | `apps/web`, `apps/api`, `apps/mobile-ios`                                             | Core     | Web is the primary hosted surface. iOS is a required first-class surface.                                                                                      |
| AI orchestration              | Provider configs, roles, pipelines, run execution, invocation logging                              | `apps/ai-orchestration`, `packages/adapters`, `packages/contracts`, `packages/events` | Core     | Provider boundary and secret handling are real.                                                                                                                |
| Project indexing and memory   | Searchable project context, code memory, retrieval state for AI workflows                          | No dedicated subsystem yet                                                            | Core     | Canonical boundary exists; implementation is incomplete. See [docs/implementation-gaps.md](./implementation-gaps.md).                                          |
| Scaffold and template engine  | Turn an idea into a new project or a known stack template                                          | `packages/scaffold/` (4 built-in bundled templates, `scaffold`/`getTemplate`/`getAllTemplates`) | Core     | Implemented.                                                                                                                                                   |
| Stack adapters                | Detect, normalize, and operate across many stacks without leaking stack details into core services | `packages/stack-registry/` (10 stacks, `getStack`/`getAllStacks`/`detectStack`)       | Core     | Implemented as static config-driven registry.                                                                                                                  |
| Runtime and execution manager | Create sessions, allocate runtime capacity, start and stop runs, manage lifecycle                  | `apps/orchestrator`, `apps/worker-manager`, `apps/host-agent`, `apps/session-reaper`  | Core     | Hosted runtime is canonical. Isolation approach decided: container-per-session ([ADR 014](./adr/014-container-per-session-isolation.md)). Implementation open. |
| Preview system                | Turn a running session into a user-facing preview URL or preview frame                             | `apps/gateway`, preview route repositories, web/iOS preview consumers                 | Core     | Hosted preview is canonical.                                                                                                                                   |
| Export and deploy adapters    | Hand off artifacts to Git providers, storage, or external deploy targets                           | `packages/adapters`, `packages/database` project repo and artifact tables             | Adapter  | Deployment is not the core product.                                                                                                                            |
| Provider and secret handling  | Store refs, fetch secrets, invoke providers, redact sensitive fields                               | `packages/adapters`, `apps/ai-orchestration`                                          | Core     | Strong boundary. Keep it.                                                                                                                                      |
| Collaboration support         | Comments, presence, websocket fan-out                                                              | `apps/collaboration`                                                                  | Optional | Present in code, not a defining product concept.                                                                                                               |
| Android client                | Additional mobile surface                                                                          | `apps/mobile-android`                                                                 | Optional | Exists in repo. Not first-class in the canonical product story.                                                                                                |

## Core, adapter, and optional infrastructure

### Core

- Hosted web client, hosted iOS client, and the API surface they consume.
- Hosted runtime lifecycle: session creation, preview creation, run orchestration, provider-backed AI execution.
- Provider credential handling through a secret-manager boundary.
- Project-centered product model defined in [docs/domain-model.md](./domain-model.md), even where code still uses workspace-shaped routes and tables.

### Adapter

- Git provider integration.
- Object storage, billing, queue, and deployment/export handoff.
- Any infrastructure used to move artifacts out of the product boundary.

### Optional or non-core

- Collaboration and presence.
- Android client.
- Local-only operator workflows.
- Any future enterprise tenancy or workspace administration layer not backed by an explicit ADR.

## Default topology

### Canonical hosted path

1. Web or iOS authenticates through the hosted auth flow.
2. Client traffic hits the hosted API surface.
3. API delegates session, preview, and AI work to hosted internal services.
4. Orchestrator and runtime services allocate or manage hosted execution.
5. Gateway exposes preview traffic for active sessions.
6. AI orchestration resolves provider config, fetches secrets, invokes adapters, and records results.

### Supported local path

1. Developers run the same services locally against local PostgreSQL and Redis.
2. Web can be served locally.
3. iOS can point at local API and gateway URLs during local development.
4. Hosted runtime behavior can be partially validated locally, but full hosted isolation is not implemented in this repo yet.

## Request flows

### Open an existing project

1. User signs in on web or iOS.
2. Client calls the hosted API for the current user and project list.
3. API resolves authorization using the current implementation's workspace-shaped access checks.
4. Project metadata, sessions, previews, and AI runs are returned to the client.
5. Canonical product meaning is still "a solo builder opening a project", even though the current API shape remains workspace-based.

### Create a new project

1. User starts from an idea or chooses an existing template.
2. Canonical architecture expects a scaffold/template boundary to pick a stack and initialize project structure.
3. The scaffold engine at `packages/scaffold/` picks a template and initializes project structure.
4. Any mismatch between the canonical scaffold boundary and the current repo must be tracked in [docs/implementation-gaps.md](./implementation-gaps.md).

### Run a project

1. User triggers a run from the hosted web or iOS surface.
2. API calls orchestrator to create or start a session.
3. Orchestrator allocates runtime capacity and a preview target.
4. Gateway serves preview traffic for that target.
5. Session lifecycle cleanup runs through session-reaper and related hosted services.

### Apply an AI edit

1. User submits an AI request from web or iOS.
2. API forwards AI work to `apps/ai-orchestration`.
3. AI orchestration loads provider config, fetches the referenced secret, selects the provider adapter, and runs the request.
4. Results are returned to the client surface and logged without leaking secrets.
5. Canonical architecture expects project memory, retrieval, and stack-aware edit safety. Those boundaries are only partially present in code today.

## Current implementation notes

- The canonical model is project-centered and solo-first. ADR 013 Phase 2 is complete: project-first routes are active, new tokens use `grantedPermissions`, and `workspaceId` is retained only as an internal tenancy key. See [docs/domain-model.md](./domain-model.md).
- Hosted runtime is canonical. Isolation approach: container-per-session ([ADR 014](./adr/014-container-per-session-isolation.md)); implementation is open. Stack registry (`packages/stack-registry/`) and scaffold engine (`packages/scaffold/`) are implemented.
- **Deployment reality (2026-04-18):** Only `ai-orchestration` and `worker-manager` are deployed to hosted infrastructure. The other 5 control-plane services (`api`, `gateway`, `orchestrator`, `collaboration`, `usage-meter`) have no published container images. Their Terraform resources and dependent infrastructure (load balancer, monitoring) are disabled. The "canonical hosted path" described above is architecturally correct but not yet operational end-to-end. See [docs/current-blockers-and-resolution-options.md](./current-blockers-and-resolution-options.md).
- Collaboration exists as a service, but it is frozen as dormant and not part of the product center.
- Workflow files are intentionally out of scope for this pass. Any architecture drift encoded there is tracked in [docs/implementation-gaps.md](./implementation-gaps.md).
