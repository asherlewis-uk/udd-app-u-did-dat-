# Execution Modes

Back to [docs/_INDEX.md](./_INDEX.md).

## Canonical rule

The product is **hosted-first**. Product docs, architecture docs, and client-surface planning assume hosted execution by default. Local development is supported for building, operating, and validating the product, but local execution is not the default product story.

## Modes

| Mode | Canonical? | Primary users | Primary surfaces | Trust boundary | Current repo support |
|---|---|---|---|---|---|
| Hosted product mode | Yes | End users and operators | Web and iOS | Hosted API, hosted runtime services, hosted preview gateway, provider adapters, secret manager | Present, but incomplete in runtime isolation and some service wiring |
| Local development mode | Supported | Engineers and operators | Local web, local services, local iOS testing | Developer machine, local PostgreSQL/Redis, local shell, local gateway | Present, but not cleanly packaged and has port/config drift |

## Hosted product mode

### When to use it

- Day-to-day product use.
- Hosted project editing, running, previewing, and AI-assisted work.
- Canonical user-facing documentation.

### Characteristics

- Web and iOS are first-class clients.
- Runtime sessions are expected to execute on hosted infrastructure.
- Previews are expected to resolve through the hosted gateway.
- AI calls are expected to route through `apps/ai-orchestration` and the provider adapter boundary.
- Secrets are expected to resolve through the external secret manager path in production.

### Tradeoffs

- Requires durable hosted runtime infrastructure.
- Requires clean service-to-service auth, observability, and capacity accounting.
- Keeps the product experience consistent across web and iOS.

## Local development mode

### When to use it

- Building the product locally.
- Running tests.
- Validating stack behavior before or instead of hosted execution.
- Exercising web and iOS clients against local services.

### Characteristics

- Services run directly on the developer machine.
- PostgreSQL and Redis must be supplied locally.
- Local iOS work still depends on macOS and Xcode.
- Local preview validation is limited by the repo's current runtime gaps.

### Tradeoffs

- Easier debugging and lower iteration cost.
- Less representative of final hosted isolation and capacity behavior.
- Requires explicit port management because several apps default to overlapping ports.

## Trust boundaries

### Hosted mode

- Client devices trust only the public API and preview surfaces.
- Internal services trust shared auth, database, queue, and secret-manager boundaries.
- Hosted runtime targets must never be selected from client input.
- Preview authorization is enforced at the gateway on every request.

### Local mode

- The developer machine is the trust root.
- Local commands run with local user permissions.
- Secret handling must still follow [docs/security-model.md](./security-model.md), but development may use in-memory or local-only substitutes where documented.
- Local mode must never be confused with the production security posture.

## Canonical vs supported infrastructure

- Hosted mode is the canonical product story and the canonical architecture baseline.
- Local mode is a supported development and validation mode.
- If docs for a local workflow conflict with hosted-first product scope, [docs/product-scope.md](./product-scope.md) and [docs/architecture.md](./architecture.md) win.
- If current code does not match either mode cleanly, record the mismatch in [docs/implementation-gaps.md](./implementation-gaps.md).

## Current implementation notes

- The repo strongly reflects hosted services, gateway previews, and internal orchestration. That aligns with the hosted-first product story.
- Local development is possible, but `pnpm dev` is not a clean all-services entrypoint today because several services collide on default ports.
- Runtime isolation in hosted mode is not complete. Host-agent capacity reporting is stubbed and MicroVM-level isolation is not implemented.
