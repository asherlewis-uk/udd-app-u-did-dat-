# ADR 006: External Secret Manager for AI Provider Credentials

**Status**: Accepted  
**Date**: 2026-04-11

## Context

Users supply API keys for their AI providers (Anthropic, OpenAI, etc.). These credentials must:
- Never appear in the database
- Never appear in logs or audit records
- Be rotatable without downtime
- Have access auditable at the infrastructure level
- Be revocable independently of the database

## Decision

All provider credentials are stored exclusively in AWS Secrets Manager (production) or an in-memory store (development/testing). The database stores only an opaque `credential_secret_ref` string (the ARN or key in the secret manager). The application:

1. On create/update: writes credential to secret manager → receives a ref → stores the ref in DB.
2. On invoke: reads the ref from DB → fetches the actual credential from secret manager → passes directly to the adapter → ref goes out of scope.
3. On rotate: writes new credential under a new ref → updates DB to new ref → schedules deletion of old ref.
4. On delete: schedules deletion of the ref in secret manager.

**Access control**: Only the `ai-orchestration` service has IAM permissions to write secrets. Other services can only read. The gateway and API services have no secret access.

## Consequences

- Database compromise does not expose credentials — only opaque refs.
- Secret access is audited at the AWS level (CloudTrail).
- Rotation is a first-class operation with audit trail.
- Adds a secret manager API call on every model invocation — latency acceptable given model invocation latency is orders of magnitude larger.
- Development uses `InMemorySecretManagerProvider` — this must never be used in staging/production.
