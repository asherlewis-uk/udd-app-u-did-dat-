# Environment Variable Contract

All services consume configuration via `packages/config/src/index.ts`.
This document is the canonical reference for all environment variables.

## Required everywhere

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `JWT_SECRET` | Secret for signing session JWTs |
| `NODE_ENV` | `development` \| `staging` \| `production` \| `test` |

## Auth (WorkOS)

| Variable | Description |
|----------|-------------|
| `WORKOS_API_KEY` | WorkOS API key |
| `WORKOS_CLIENT_ID` | WorkOS OAuth client ID |
| `WORKOS_WEBHOOK_SECRET` | WorkOS webhook signing secret |
| `JWT_EXPIRES_IN_SECONDS` | Session token TTL (default: 86400) |

## Secret Manager

| Variable | Description |
|----------|-------------|
| `SECRET_MANAGER_PROVIDER` | `aws` \| `memory` (dev/test only) |
| `AWS_REGION` | AWS region (default: us-east-1) |
| `AWS_SECRETS_PREFIX` | Prefix for secret names (default: /udd/) |

## Object Storage

| Variable | Description |
|----------|-------------|
| `OBJECT_STORAGE_PROVIDER` | `aws` \| `local` |
| `OBJECT_STORAGE_BUCKET` | S3 bucket name |

## Queue

| Variable | Description |
|----------|-------------|
| `QUEUE_PROVIDER` | `sqs` \| `redis` |
| `SQS_QUEUE_URL_PREFIX` | SQS queue URL prefix |

## Telemetry

| Variable | Description |
|----------|-------------|
| `OTEL_SERVICE_NAME` | Service name for traces/logs |
| `OTLP_ENDPOINT` | OpenTelemetry collector endpoint |
| `LOG_LEVEL` | `debug` \| `info` \| `warn` \| `error` (default: info) |

## Service Discovery

| Variable | Description |
|----------|-------------|
| `API_BASE_URL` | API gateway internal URL |
| `ORCHESTRATOR_BASE_URL` | Orchestrator internal URL |
| `COLLABORATION_BASE_URL` | Collaboration service internal URL |
| `AI_ORCHESTRATION_BASE_URL` | AI orchestration internal URL |
| `WORKER_MANAGER_BASE_URL` | Worker manager internal URL |
| `GATEWAY_BASE_URL` | Preview gateway public URL |

## Worker / Reaper

| Variable | Description |
|----------|-------------|
| `WORKER_HOST` | Hostname reported by host-agent |
| `WORKER_HEARTBEAT_INTERVAL_MS` | Heartbeat interval (default: 30000) |
| `IDLE_SESSION_SCAN_INTERVAL_MS` | Reaper scan interval (default: 60000) |
| `STUCK_RUN_TIMEOUT_MS` | Pipeline run stuck timeout (default: 300000) |

## Preview

| Variable | Description |
|----------|-------------|
| `PREVIEW_DOMAIN` | Domain for preview URLs |
| `PREVIEW_DEFAULT_TTL_SECONDS` | Default preview TTL (default: 3600) |

## Web App (NEXT_PUBLIC_*)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | API base URL for browser clients |
| `GATEWAY_URL` | Gateway URL for Next.js rewrites |

## Security rules

- **Never** commit `.env` files
- **Never** put real credentials in `.env.example`
- **Never** use `SECRET_MANAGER_PROVIDER=memory` in staging or production
- All secret values for AI providers must be stored in the external secret manager — `packages/config` provides no mechanism to pass credentials through env vars
