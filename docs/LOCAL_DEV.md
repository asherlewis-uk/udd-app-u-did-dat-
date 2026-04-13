# Local Development Setup

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop (for PostgreSQL + Redis)

## 1. Install dependencies

```bash
pnpm install
```

## 2. Start local infrastructure (Docker)

**The repo does not include a `docker-compose.yml`.** Create the following file at the repo root:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: udd_dev
      POSTGRES_USER: udddev
      POSTGRES_PASSWORD: udddev
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
volumes:
  pgdata:
```

Then start:

```bash
docker compose up -d
```

## 3. Configure environment variables

**There is no `.env.example` in this repo.** The canonical variable reference is `docs/ENV_CONTRACT.md`. Create a `.env` file at the repo root with at minimum:

```env
DATABASE_URL=postgresql://udddev:udddev@localhost:5432/udd_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-prod
NODE_ENV=development

# WorkOS (required for auth flow — get from WorkOS dashboard)
WORKOS_API_KEY=your-workos-api-key
WORKOS_CLIENT_ID=your-workos-client-id
WORKOS_WEBHOOK_SECRET=your-workos-webhook-secret

# Use in-memory or local providers for dev
# NODE_ENV=development causes ai-orchestration to use InMemorySecretManagerProvider
OBJECT_STORAGE_PROVIDER=local
OBJECT_STORAGE_BUCKET=dev-bucket
QUEUE_PROVIDER=redis

# Service discovery (all running locally)
API_BASE_URL=http://localhost:3001
ORCHESTRATOR_BASE_URL=http://localhost:3002
COLLABORATION_BASE_URL=http://localhost:3003
AI_ORCHESTRATION_BASE_URL=http://localhost:3004
WORKER_MANAGER_BASE_URL=http://localhost:3005
GATEWAY_BASE_URL=http://localhost:3000

# Web app
NEXT_PUBLIC_API_URL=http://localhost:3001
GATEWAY_URL=http://localhost:3000

# Host agent (if running locally)
WORKER_HOST=localhost
```

See `docs/ENV_CONTRACT.md` for the full variable reference.

**Security rules:**
- Never commit `.env` files
- `NODE_ENV=production` in `apps/ai-orchestration/src/context.ts` triggers `GCPSecretManagerProvider`. Do not set `NODE_ENV=production` locally unless you have GCP credentials configured.

## 4. Run migrations

```bash
pnpm --filter="@udd/database" migrate
```

Verify:

```bash
psql postgresql://udddev:udddev@localhost:5432/udd_dev \
  -c "SELECT version, applied_at FROM schema_migrations ORDER BY applied_at;"
```

## 5. Build shared packages

```bash
pnpm build --filter="./packages/*"
```

This step is required before starting services. Apps import from compiled package output directories.

## 6. Start all services

```bash
pnpm dev
```

Turborepo starts all services in parallel with file watching:

| Service | URL |
|---------|-----|
| Preview Gateway | http://localhost:3000 |
| API | http://localhost:3001 |
| Orchestrator | http://localhost:3002 |
| Collaboration | http://localhost:3003 |
| AI Orchestration | http://localhost:3004 |
| Worker Manager | http://localhost:3005 |
| Web App | http://localhost:3006 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

**Note:** `session-reaper` and `usage-meter` are background services. Run them separately if needed:

```bash
pnpm --filter="@udd/session-reaper" dev
pnpm --filter="@udd/usage-meter" dev
```

## Health checks

Every service exposes:

```
GET /health   — full health report with dependency statuses
GET /ready    — readiness probe
GET /alive    — liveness probe
```

## Running tests

```bash
pnpm test:unit          # Unit tests (no external dependencies required)
pnpm test:integration   # Integration tests (requires DB + Redis from step 2)
pnpm test               # All tests
```

## Useful commands

```bash
pnpm typecheck          # TypeScript check across all packages and apps
pnpm lint               # ESLint
pnpm format             # Auto-format with Prettier
pnpm format:check       # Check formatting without modifying files
pnpm build              # Full build of all packages and apps
```
