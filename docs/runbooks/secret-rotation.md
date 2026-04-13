# Runbook: AI Provider Secret Rotation

Credentials are stored in GCP Secret Manager. The DB stores only the resource name ref (`credential_secret_ref`). See ADR 006 (revised).

## Planned Rotation (user-initiated)

Users rotate credentials via the UI or API:

```
POST /v1/workspaces/{workspaceId}/ai/providers/{providerConfigId}/rotate-secret
{ "newCredential": "sk-..." }
```

The `ai-orchestration` service:
1. Writes new credential to GCP Secret Manager → receives new resource name ref.
2. Updates `provider_configs.credential_secret_ref` to new ref.
3. Schedules deletion of old ref in GCP Secret Manager.
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

The `credential_secret_ref` should show the new GCP Secret Manager resource name (newer version in the name).

## Rollback

If the new credential is invalid:
1. Rotate again with the correct credential.
2. The old ref is scheduled for deletion but not immediately deleted — check with GCP Secret Manager before it is destroyed:

```bash
gcloud secrets versions list {SECRET_NAME} --project={PROJECT_ID}
```

If the old version is still present and in `ENABLED` state, you can restore it by updating `provider_configs.credential_secret_ref` to point to the old resource name.

## Monitoring

- `secret_rotation_outcome` metric — counter with `success/failure` labels.
- Alert if `failure` count > 0 in any 5-minute window.
- GCP Cloud Audit Logs capture all secret access at the infrastructure level.
