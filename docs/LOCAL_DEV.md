# Local Development

Back to [docs/\_INDEX.md](./_INDEX.md).

## Purpose

This guide is for developers and operators working on the hosted product locally. The product is hosted-first. Local setup exists to build, test, and validate the product, not to redefine the product story.

## Required tools

### For all repo work

- Node.js `20+`
- pnpm `9+`
- Docker or another way to run PostgreSQL and Redis locally

### For iOS work

- macOS
- Xcode `15+`
- iOS Simulator support

## Install

```bash
pnpm install
```

## Local infrastructure

Start PostgreSQL:

```bash
docker run --name udd-postgres ^
  -e POSTGRES_DB=udd_dev ^
  -e POSTGRES_USER=udddev ^
  -e POSTGRES_PASSWORD=udddev ^
  -p 5432:5432 ^
  -d postgres:16
```

Start Redis:

```bash
docker run --name udd-redis -p 6379:6379 -d redis:7-alpine
```

If those containers already exist, start them instead of recreating them:

```bash
docker start udd-postgres udd-redis
```

## Environment setup

Set the minimum runtime variables before starting services:

```powershell
$env:NODE_ENV='development'
$env:DATABASE_URL='postgresql://udddev:udddev@localhost:5432/udd_dev'
$env:REDIS_URL='redis://localhost:6379'
$env:JWT_SECRET='dev-secret'
$env:WORKOS_API_KEY='your-workos-api-key'
$env:WORKOS_CLIENT_ID='your-workos-client-id'
$env:WORKOS_WEBHOOK_SECRET='your-workos-webhook-secret'
$env:NEXT_PUBLIC_WORKOS_CLIENT_ID='your-workos-client-id'
$env:API_BASE_URL='http://localhost:8080'
$env:ORCHESTRATOR_BASE_URL='http://localhost:3002'
$env:COLLABORATION_BASE_URL='http://localhost:3003'
$env:AI_ORCHESTRATION_BASE_URL='http://localhost:3004'
$env:WORKER_MANAGER_BASE_URL='http://localhost:3005'
$env:GATEWAY_BASE_URL='http://localhost:3000'
$env:NEXT_PUBLIC_API_URL='http://localhost:8080'
$env:GATEWAY_URL='http://localhost:3000'
$env:OBJECT_STORAGE_PROVIDER='local'
$env:OBJECT_STORAGE_BUCKET='udd-local'
$env:QUEUE_PROVIDER='sqs'
$env:WORKER_HOST='10.0.0.10'
$env:WORKER_SUBNET_PREFIX='10.'
```

The full catalog is in [docs/ENV_CONTRACT.md](./ENV_CONTRACT.md).

## Database boot sequence

1. Build shared packages:

```bash
pnpm build --filter="./packages/*"
```

2. Run migrations:

```bash
pnpm --filter @udd/database build
pnpm --filter @udd/database migrate
```

3. Verify migrations applied:

```bash
psql postgresql://udddev:udddev@localhost:5432/udd_dev -c "SELECT version, applied_at FROM schema_migrations ORDER BY applied_at;"
```

## Recommended local service startup

Do **not** rely on `pnpm dev` as the clean all-services entrypoint. The current repo has default port collisions. **Decision:** Code defaults will be changed so no two services share a default port. Until then, use explicit port overrides as shown below.

### Minimum hosted-web stack

Start these in separate terminals:

```bash
pnpm --filter @udd/api dev
pnpm --filter @udd/orchestrator dev
pnpm --filter @udd/ai-orchestration dev
pnpm --filter @udd/worker-manager dev
pnpm --filter @udd/gateway dev
```

Start the web app on a non-conflicting port:

```powershell
$env:PORT='3006'; pnpm --filter @udd/web dev
```

### Optional supporting services

```bash
pnpm --filter @udd/collaboration dev
pnpm --filter @udd/host-agent dev
```

Run usage meter on a non-conflicting port:

```powershell
$env:PORT='3007'; pnpm --filter @udd/usage-meter dev
```

Run session reaper in a dedicated terminal:

```bash
pnpm --filter @udd/session-reaper dev
```

## Tests

```bash
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:integration
pnpm test
```

## Representative local stack validation

### Hosted web surface

1. Start the minimum hosted-web stack above.
2. Open the local web app at `http://localhost:3006`.
3. Sign in through the local auth flow.
4. Verify project and workspace pages load against the local API.

### iOS surface

1. On macOS, open `apps/mobile-ios/Package.swift` in Xcode.
2. Confirm `AppConfig.swift` points DEBUG builds at the local API and gateway. **Note:** Current AppConfig.swift contains placeholder values; these will be replaced with real environment-specific compile-time config using Xcode build-phase parameterization. See [docs/implementation-gaps.md](./implementation-gaps.md).
3. Run the generated `UDDCompanion` scheme in Simulator.
4. Sign in and verify the iOS client can load workspaces, projects, sessions, and previews against the local stack.

## Validate AI provider configuration locally

### Fast validation

```bash
pnpm --filter @udd/adapters test
```

This verifies the adapter registry and secret-manager test surface.

### End-to-end local validation

1. Start `@udd/api` and `@udd/ai-orchestration` with `NODE_ENV=development`.
2. Sign in through the local web app or iOS app.
3. Capture a workspace ID from `/v1/workspaces`.
4. POST a provider config to `/v1/workspaces/{workspaceId}/ai/providers`.
5. Verify the response omits plaintext credentials.
6. Verify the `provider_configs` table stores only `credential_secret_ref`.

The current route body requires:

- `name`
- `providerType`
- `endpointUrl`
- `authScheme`
- `credential`

## Validate preview behavior locally

### Supported validation path today

```bash
pnpm --filter @udd/gateway test
```

This is the reliable local validation path for preview authorization and proxy behavior in the current repo.

### Manual local smoke test

1. Start API, gateway, orchestrator, worker-manager, and host-agent locally.
2. Use the web or iOS client to start a session and request a preview.
3. Verify preview URL creation and gateway auth behavior.

Current limitation: the hosted runtime boot path is incomplete, so full preview execution is not a trustworthy local proof of production runtime behavior. That is a known gap, not a doc omission.

## Docs index maintenance

There is no doc-index generator in this repo. Update these files manually when docs move or priorities change:

- `docs/_INDEX.md`
- `README.md`
- `AGENTS.md`

After updating links, run a quick link and terminology sweep before merging.

