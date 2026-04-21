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
- iOS Simulator support, or a physical device paired with Xcode

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
$env:QUEUE_PROVIDER='noop'
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

### Minimum hosted-web stack

Start these in separate terminals:

```bash
pnpm --filter @udd/api dev
pnpm --filter @udd/orchestrator dev
pnpm --filter @udd/ai-orchestration dev
pnpm --filter @udd/worker-manager dev
pnpm --filter @udd/gateway dev
pnpm --filter @udd/web dev
```

Each service has a unique default port — no manual overrides needed. See [docs/ENV_CONTRACT.md](./ENV_CONTRACT.md) for the full port map.

### Optional supporting services

```bash
pnpm --filter @udd/collaboration dev
pnpm --filter @udd/host-agent dev
pnpm --filter @udd/usage-meter dev
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
2. Open the local web app at `http://localhost:3007`.
3. Sign in through the local auth flow.
4. Verify project and workspace pages load against the local API.

### iOS surface

#### Repo-side readiness

The repo's iOS app is already parameterized for local and hosted builds:

- Open `apps/mobile-ios/UDDCompanion.xcodeproj` in Xcode when you need an installable iOS app bundle.
- Keep `apps/mobile-ios/Package.swift` for package-only source and test workflows.
- `Info.plist` exposes `UDD_API_BASE_URL`, `UDD_GATEWAY_BASE_URL`, and `UDD_WORKOS_CLIENT_ID` as Xcode build settings.
- `AppConfig.swift` reads those values from `Bundle.main.infoDictionary`.
- DEBUG / local-dev fallback behavior is already implemented:
  - `UDD_API_BASE_URL` falls back to `http://localhost:8080`
  - `UDD_GATEWAY_BASE_URL` falls back to `http://localhost:3000`
  - `UDD_WORKOS_CLIENT_ID` falls back to an empty string, which is sufficient only for unsigned / no-auth local launch paths
- Non-debug builds fail fast if required values are missing or unresolved.

See [docs/ENV_CONTRACT.md](./ENV_CONTRACT.md) for the canonical iOS config contract.

#### Machine-side readiness

The repo being ready for iOS work is not the same as the Mac being ready for iOS work. Before local iOS development is usable on a given Mac, confirm these machine prerequisites:

1. Full Xcode is installed.
2. The active developer directory points at full Xcode, not Command Line Tools:

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
```

3. If you plan to use Simulator, install at least one iOS Simulator runtime in Xcode and ensure at least one simulator device exists.
4. If you plan to use a physical iPhone instead, pair the device with Xcode, trust the computer/device prompts, and enable Developer Mode on the phone when prompted.

#### Local run path

1. Start the local services needed by the iOS app, especially API and gateway.
2. On macOS, open `apps/mobile-ios/UDDCompanion.xcodeproj` in Xcode.
3. Choose either Simulator or a paired physical iPhone as the run destination.
4. For unsigned / no-auth local launch in Simulator, the DEBUG fallbacks above are sufficient.
5. For physical-device testing, do not rely on `localhost` fallbacks. Set `UDD_API_BASE_URL` and `UDD_GATEWAY_BASE_URL` as Xcode target build settings or in an `.xcconfig` to reachable HTTPS endpoints or secure tunneled URLs that the phone can access. `localhost` on a phone resolves to the phone itself, not to the Mac running the local stack.
6. For signed-in local validation, also provide a real `UDD_WORKOS_CLIENT_ID` as an Xcode target build setting or in an `.xcconfig`, then verify the iOS client can load projects, sessions, and previews against the configured API and gateway.

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
