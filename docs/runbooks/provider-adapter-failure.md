# Runbook: Provider Adapter Failure

**Status:** Canonical  
Back to [docs/_INDEX.md](../_INDEX.md).

## Symptoms

- provider endpoint unreachable
- invalid credentials
- adapter contract mismatch
- rate limit or quota exhaustion
- suspicious logging around provider requests

## Diagnosis

1. Check `ai-orchestration` logs with correlation ID.
2. Confirm the provider config is active.
3. Confirm the current secret ref exists and can be resolved.
4. Identify whether the failure is network, credential, contract, or provider-side quota.

## Recovery

### Provider unreachable

- retry after confirming external provider status
- fail the current run if retry is not safe

### Invalid credentials

- rotate the secret
- verify the DB stores only the new secret ref

### Adapter contract mismatch

- inspect `packages/adapters` and the provider type mapping
- do not patch core services around the adapter boundary

### Rate limit or quota issue

- back off or cancel the run
- switch provider configuration only if policy allows it

## Redaction rules

- Do not paste plaintext provider credentials into tickets, logs, or docs.
- Audit only secret refs and safe metadata.

## Follow-up

- If this exposed a hidden env or provider-selection issue, log it in [docs/implementation-gaps.md](../implementation-gaps.md).
- If secret rotation is required, continue with [secret-rotation.md](./secret-rotation.md).
