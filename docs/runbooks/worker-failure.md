# Runbook: Worker Failure

**Status:** Canonical  
Back to [docs/\_INDEX.md](../_INDEX.md).

## Use this runbook when

- hosted sessions stop starting
- hosted previews return backend failures
- host-agent heartbeats stop updating

## Diagnosis

### Check capacity snapshots

```sql
SELECT worker_host, total_slots, used_slots, healthy, reported_at
FROM worker_capacity
ORDER BY reported_at DESC;
```

### Check for stranded sessions

```sql
SELECT id, workspace_id, state, worker_host, host_port
FROM sessions
WHERE state IN ('starting', 'running', 'idle')
ORDER BY updated_at DESC;
```

## Recovery

1. Restart the affected host-agent or runtime-host process if possible.
2. Revoke previews bound to dead runtime targets.
3. Mark stranded sessions failed if they cannot recover.
4. Let users start fresh sessions after runtime capacity stabilizes.

## Manual preview revoke

```sql
UPDATE preview_routes
SET state = 'revoked',
    revoked_at = NOW(),
    version = version + 1
WHERE worker_host = '<failed-worker-host>'
  AND state = 'active';
```

## Manual session fail

```sql
UPDATE sessions
SET state = 'failed',
    updated_at = NOW(),
    version = version + 1
WHERE worker_host = '<failed-worker-host>'
  AND state IN ('starting', 'running', 'idle');
```

## Notes

- Current host-agent capacity reporting is stubbed, so operator confidence should stay low until container-per-session isolation ([ADR 014](../adr/014-container-per-session-isolation.md)) and capacity truth improve.
- Session reaper canonical model: scheduled single-invocation job. Current code runs as a long-lived interval loop. If session-reaper cleanup appears stalled, check whether the scheduler trigger is firing rather than assuming the process is hung.
- If the failure is local rather than hosted, use [local-runtime-failure.md](./local-runtime-failure.md).
