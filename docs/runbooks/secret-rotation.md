# Runbook: AI Provider Secret Rotation

## Planned Rotation (user-initiated)

Users rotate credentials via the UI or API:
```
POST /v1/workspaces/{workspaceId}/ai/providers/{providerConfigId}/rotate-secret
{ "newCredential": "sk-..." }
```

The `ai-orchestration` service:
1. Writes new credential to secret manager → receives new ref.
2. Updates `provider_configs.credential_secret_ref` to new ref.
3. Schedules deletion of old ref in secret manager.
4. Emits `provider_config.secret_rotated` event → audit log.

## Emergency Rotation (credential compromised)

1. **Revoke the credential at the provider** (Anthropic dashboard, OpenAI dashboard, etc.) immediately.
2. **Rotate via the API** with the new credential (above).
3. **Check audit logs** for recent invocations with the old credential:
   ```sql
   SELECT * FROM model_invocation_logs
   WHERE provider_config_id = '<id>'
     AND created_at > '<compromise-time>'
   ORDER BY created_at DESC;
   ```
4. **Notify affected users** if unauthorized invocations occurred.

## Verifying Rotation Succeeded

```sql
SELECT id, name, credential_secret_ref, updated_at
FROM provider_configs
WHERE id = '<provider-config-id>';
```

The `credential_secret_ref` should show the new ref (newer timestamp in the ref name).

## Rollback

If the new credential is invalid:
1. Rotate again with the correct credential.
2. The old ref is scheduled for deletion but not immediately deleted — check with AWS Secrets Manager before it expires.

## Monitoring

- `secret_rotation_outcome` metric — counter with `success/failure` labels.
- Alert if `failure` count > 0 in any 5-minute window.
