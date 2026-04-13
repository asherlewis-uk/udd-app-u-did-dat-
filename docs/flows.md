# Flows

Back to [docs/_INDEX.md](./_INDEX.md).

## Canonical user and system flows

Hosted product flows come first. Local-development flows exist to support building and validating the product.

## Create project from idea

1. User starts from web or iOS.
2. User gives an idea or selects a known stack template.
3. Canonical flow passes through scaffold selection and stack detection.
4. Project metadata is created.
5. Initial files and stack defaults are produced.
6. User lands in the hosted project view, ready to run or edit.

Current repo note: project persistence exists, but a first-class scaffold engine does not. See [docs/implementation-gaps.md](./implementation-gaps.md).

## Open or import existing project

1. User signs in on web or iOS.
2. Client fetches available projects.
3. User opens an existing project or imports a repo-backed project.
4. Project metadata, recent sessions, previews, and AI history are loaded.

Current repo note: the current API and UI still route through workspace-shaped ownership.

## Detect stack

1. System inspects project files or explicit stack metadata.
2. Stack adapter resolves language, framework, runtime hints, and preview defaults.
3. Result feeds scaffolding, runtime commands, preview behavior, and AI edit safety.

Current repo note: this is a canonical boundary without a first-class implementation yet.

## Scaffold from template

1. User picks a template or accepts an AI suggestion.
2. Scaffold engine generates baseline files and stack metadata.
3. Runtime and preview defaults are attached to the project.
4. User can immediately start a hosted run or continue editing.

Current repo note: template scaffolding is not implemented as a dedicated subsystem yet.

## Apply AI edits safely

1. User submits an AI request from web or iOS.
2. Request includes project context, edit intent, and current file or run context.
3. AI orchestration loads provider config and secret ref, invokes the adapter, and returns a safe result.
4. The client displays or applies the suggested change.
5. The system records run or invocation metadata without leaking credentials.

Current repo note: provider-backed invocation exists. Dedicated project memory and stack-aware edit safety are still partial.

## Run and test in hosted mode

1. User starts a run session from web or iOS.
2. API calls orchestrator.
3. Orchestrator creates or starts the session and allocates runtime capacity.
4. Session state advances through the runtime lifecycle.
5. User observes status and logs from the hosted product surfaces.

Current repo note: hosted session lifecycle exists, but runtime isolation and capacity truth are incomplete.

## Preview in hosted mode

1. User requests a preview for a running session.
2. Preview binding is created for that session.
3. Gateway validates auth, route state, TTL, and target safety on every request.
4. Web or iOS loads the preview surface through the gateway.

## Run and test locally

1. Developer starts local infrastructure and the needed services.
2. Developer opens the hosted web client locally or points the iOS client at local API and gateway URLs.
3. Developer validates project behavior or service wiring on the local machine.

Current repo note: local development is supported but requires manual setup and explicit port handling.

## Preview locally

1. Developer runs gateway and the relevant local services.
2. Developer validates gateway behavior or preview-facing UI locally.
3. Any full end-to-end preview claim must be limited by the current hosted-runtime gaps.

## Optionally export or deploy

1. User chooses an external target.
2. Export or deploy adapter hands off repo, artifact, or metadata.
3. Product records the result and external reference.

Deployment is adapter-based. It is not the core product loop.

## Rotate provider credential

1. User updates a provider credential through the provider-management flow.
2. AI orchestration writes the new secret through the secret-manager boundary.
3. Product updates the stored secret ref.
4. Old secret ref is retired on the provider-specific rotation path.
5. Subsequent invocations use the new secret ref.
