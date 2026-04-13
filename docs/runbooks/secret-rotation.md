# Runbook: Secret Rotation

**Status:** Canonical  
Back to [docs/_INDEX.md](../_INDEX.md).

## Use this runbook when

- a provider credential is compromised
- a provider credential expires
- local provider validation needs a fresh development credential

## Hosted rotation path

1. Revoke or replace the provider credential at the external provider.
2. Call the rotate-secret route on the provider config:
   `POST /workspaces/:id/ai/providers/:providerConfigId/rotate-secret`
3. Confirm the stored `credential_secret_ref` changed.
4. Confirm new invocations succeed.

## Local development path

- In development and test, current code uses `InMemorySecretManagerProvider`.
- Restarting the local `ai-orchestration` process clears the in-memory secret store.
- Recreate the provider config if you need a clean local secret state.

## Verification

```sql
SELECT id, credential_secret_ref, updated_at
FROM provider_configs
WHERE id = '<provider-config-id>';
```

The DB should contain only the secret ref, never the plaintext credential.

## Recovery

- If rotation fails because the new credential is invalid, rotate again with a valid credential.
- If the secret manager itself is failing, switch to [provider-adapter-failure.md](./provider-adapter-failure.md).
