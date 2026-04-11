# Local Development Setup

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop (for PostgreSQL + Redis)
- AWS CLI (for secret manager in dev — or use InMemorySecretManagerProvider)

## 1. Install dependencies

```bash
pnpm install
```

## 2. Start local services (Docker)

```bash
# PostgreSQL + Redis
docker compose up -d
```

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: udd_dev
      POSTGRES_USER: udddev
      POSTGRES_PASSWORD: udddev
    ports: ["5432:5432"]
    volumes: [pgdata:/var/lib/postgresql/data]
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
volumes:
  pgdata:
```

## 3. Configure environment variables

Copy and fill in:

```bash
cp .env.example .env
```

Minimum required in `.env`:

```env
DATABASE_URL=postgresql://udddev:udddev@localhost:5432/udd_dev
REDIS_URL=redis://localhost:6379
JWT_SECRET=dev-secret-change-in-prod
WORKOS_API_KEY=your-workos-api-key
WORKOS_CLIENT_ID=your-workos-client-id
WORKOS_WEBHOOK_SECRET=your-workos-webhook-secret
SECRET_MANAGER_PROVIDER=memory   # uses InMemorySecretManagerProvider in dev
OBJECT_STORAGE_PROVIDER=local
OBJECT_STORAGE_BUCKET=dev-bucket
```

## 4. Run migrations

```bash
pnpm --filter="@udd/database" migrate
```

## 5. Build shared packages

```bash
pnpm build --filter="./packages/*"
```

## 6. Start all services

```bash
pnpm dev
```

This starts (via Turborepo):
- API Gateway: http://localhost:3001
- Preview Gateway: http://localhost:3000
- Orchestrator: http://localhost:3002
- Collaboration: http://localhost:3003
- AI Orchestration: http://localhost:3004
- Worker Manager: http://localhost:3005
- Web App: http://localhost:3006

## Health Checks

Each service exposes:
- `GET /health` — full health report
- `GET /ready` — readiness probe
- `GET /alive` — liveness probe

## Port Map

| Service | Port |
|---------|------|
| gateway | 3000 |
| api | 3001 |
| orchestrator | 3002 |
| collaboration | 3003 |
| ai-orchestration | 3004 |
| worker-manager | 3005 |
| web | 3006 |
| PostgreSQL | 5432 |
| Redis | 6379 |
