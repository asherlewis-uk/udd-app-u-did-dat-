# Runbook: Stale Preview Lease

**Status:** Canonical  
Back to [docs/_INDEX.md](../_INDEX.md).

## Symptoms

- Hosted preview returns `404`, `410`, or `502`
- Preview route exists but should no longer be active
- Preview route is active while the backing session is stopped or failed

## Diagnosis

```sql
SELECT pr.preview_id, pr.state, pr.expires_at, pr.worker_host, pr.host_port, s.state AS session_state
FROM preview_routes pr
JOIN sessions s ON s.id = pr.session_id
WHERE pr.preview_id = '<preview-id>';
```

## Recovery

### If the session is still valid

- extend the route expiry if the route should remain active
- or recreate the preview binding through the API

### If the session is no longer valid

- revoke the preview route
- stop or fail the stale session if it is still marked active incorrectly

## Manual revoke

```sql
UPDATE preview_routes
SET state = 'revoked',
    revoked_at = NOW(),
    version = version + 1
WHERE preview_id = '<preview-id>'
  AND state = 'active';
```

## Follow-up

- Check session lifecycle and worker health.
- If preview failures are systemic, continue with [worker-failure.md](./worker-failure.md).
