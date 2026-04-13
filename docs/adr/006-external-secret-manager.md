# ADR 006: External Secret Manager for AI Provider Credentials

**Status**: Accepted — implementation uses GCP Secret Manager (see correction note below)  
**Date**: 2026-04-11  
**Correction**: 2026-04-12

## Correction Note

The original text of this ADR specified "AWS Secrets Manager (production)". The actual implementation uses **GCP Secret Manager** (`GCPSecretManagerProvider`) in production. This was discovered during a code/docs audit in April 2026.

The selection in `apps/ai-orchestration/src/context.ts`:
```typescript
process.env['NODE_ENV'] === 'production'
  ? new GCPSecretManagerProvider()
  : new InMemorySecretManagerProvider()
```

The principle (external secret manager, no plaintext in DB) is unchanged. The provider is GCP, not AWS. All references to "AWS Secrets Manager" in this ADR are superseded by GCP Secret Manager.

---

## Context

Users supply API keys for their AI providers (Anthropic, OpenAI, etc.). These credentials must:
- Never appear in the database
- Never appear in logs or audit records
- Be rotatable without downtime
- Have access auditable at the infrastructure level
- Be revocable independently of the database

## Decision

All provider credentials are stored exclusively in GCP Secret Manager (production) or an in-memory store (development/testing). The database stores only an opaque `credential_secret_ref` string (the GCP Secret Manager resource name). The application:

1. On create/update: writes credential to GCP Secret Manager → receives a resource name ref → stores the ref in DB.
2. On invoke: reads the ref from DB → fetches the actual credential from GCP Secret Manager → passes directly to the adapter → credential goes out of scope.
3. On rotate: writes new credential under a new ref → updates DB to new ref → schedules deletion of old ref.
4. On delete: schedules deletion of the ref in GCP Secret Manager.

**Access control**: Only the `ai-orchestration` service has IAM permissions to write secrets. Other services can only read. The gateway and API services have no secret access.

**Production vs development selection:** The provider is selected by `NODE_ENV` in `apps/ai-orchestration/src/context.ts`. There is no `SECRET_MANAGER_PROVIDER` environment variable — the selection is hardcoded by environment name.

## Consequences

- Database compromise does not expose credentials — only opaque resource name refs.
- Secret access is audited at the GCP level (Cloud Audit Logs).
- Rotation is a first-class operation with audit trail.
- Adds a GCP Secret Manager API call on every model invocation — latency is acceptable given model invocation latency is orders of magnitude larger.
- Development uses `InMemorySecretManagerProvider` — this must never be used in production (enforced by `NODE_ENV=production` check).
