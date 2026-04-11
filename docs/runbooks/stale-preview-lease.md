# Runbook: Stale Preview Lease

## Symptoms
- Preview URL returns 410 or 404 but the user reports the session is still running
- Preview route in DB shows `state = 'active'` but `expires_at` is in the past
- Gateway returning `PREVIEW_EXPIRED` for what should be a live session

## Diagnosis

```sql
-- Find stale preview routes
SELECT pr.*, s.state AS session_state
FROM preview_routes pr
JOIN sessions s ON pr.session_id = s.id
WHERE pr.state = 'active'
  AND pr.expires_at < NOW()
  AND s.state = 'running';
```

## Resolution

**Extend the TTL** (for routes that should remain active):
```sql
UPDATE preview_routes
SET expires_at = NOW() + INTERVAL '1 hour', version = version + 1
WHERE id = '<route-id>' AND version = <current-version>;
```

**Revoke stale routes** (for routes belonging to stopped sessions):
```sql
UPDATE preview_routes
SET state = 'revoked', revoked_at = NOW(), version = version + 1
WHERE state = 'active' AND expires_at < NOW()
  AND session_id IN (
    SELECT id FROM sessions WHERE state IN ('stopped', 'failed')
  );
```

## Prevention
- Session-reaper automatically revokes preview routes when sessions stop.
- Verify `session-reaper` is running and its scan interval is configured correctly.
- Check `IDLE_SESSION_SCAN_INTERVAL_MS` env var on the session-reaper service.
