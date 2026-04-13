# Runbook: Session Reaper Failure

**Status:** Canonical  
Back to [docs/\_INDEX.md](../_INDEX.md).

## Canonical model

Session reaper is a **scheduled single-invocation job** (not a long-running service). A scheduler trigger fires on a cadence; the reaper process runs once, cleans up idle sessions and orphaned leases, then exits. See [docs/runtime.md](../runtime.md) and [docs/service-catalog.md](../service-catalog.md).

> **Current implementation note:** Code still runs as a long-lived interval loop. Until the scheduled-job refactor is applied, diagnosis steps below apply to both models. Where behavior differs, both paths are noted.

## Use this runbook when

- idle sessions are not being cleaned up
- orphaned preview leases accumulate
- session-reaper logs stop appearing
- operators suspect the reaper job or process is stalled

## Diagnosis

### 1. Verify the scheduler trigger is firing

Check your scheduler platform (Cloud Run Jobs scheduler, cron trigger, or equivalent) for recent invocations. If the trigger has not fired:

- Confirm the scheduler is enabled and the schedule expression is correct.
- Confirm the job target (container image, service account, endpoint) is correctly configured.
- Check scheduler platform logs for auth or quota errors.

> **Interval-loop model (current code):** If session-reaper is still running as a long-lived process, check whether the process is alive and `SCAN_INTERVAL_MS` is set to a reasonable value (default: `60000` ms).

### 2. Check for recent reaper activity

```sql
SELECT id, state, updated_at
FROM sessions
WHERE state = 'stopped'
ORDER BY updated_at DESC
LIMIT 10;
```

If no sessions have been stopped recently and idle sessions exist, the reaper is not completing its work.

### 3. Check for idle sessions that should have been reaped

```sql
SELECT id, state, updated_at,
       EXTRACT(EPOCH FROM (NOW() - updated_at)) AS idle_seconds
FROM sessions
WHERE state = 'idle'
ORDER BY updated_at ASC;
```

Sessions with `idle_seconds` greater than `IDLE_THRESHOLD_SECONDS` (default: `1800`) should have been reaped.

### 4. Check for orphaned preview leases

```sql
SELECT pr.preview_id, pr.state, pr.session_id, s.state AS session_state
FROM preview_routes pr
JOIN sessions s ON s.id = pr.session_id
WHERE pr.state = 'active'
  AND s.state IN ('stopped', 'failed');
```

Active preview routes pointing to stopped or failed sessions are orphaned and should have been cleaned up.

## Recovery

### Job did not fire

1. Fix the scheduler trigger configuration.
2. Trigger a manual run (see below).
3. Verify cleanup completed by rechecking idle sessions and orphaned leases.

### Job fired but exited early

1. Check reaper process logs for errors (database connectivity, permission failures, unhandled exceptions).
2. Fix the root cause.
3. Trigger a manual run.
4. Verify cleanup completed.

### Orphaned lease cleanup after job failure

If the reaper cannot run or is blocked, manually clean up:

**Fail idle sessions past threshold:**

```sql
UPDATE sessions
SET state = 'stopped',
    updated_at = NOW(),
    version = version + 1
WHERE state = 'idle'
  AND EXTRACT(EPOCH FROM (NOW() - updated_at)) > 1800;
```

**Revoke orphaned preview routes:**

```sql
UPDATE preview_routes
SET state = 'revoked',
    revoked_at = NOW(),
    version = version + 1
WHERE state = 'active'
  AND session_id IN (
    SELECT id FROM sessions WHERE state IN ('stopped', 'failed')
  );
```

## How to trigger a manual recovery run

**Scheduled-job model:** Invoke the job manually through your container platform (e.g., `gcloud run jobs execute session-reaper` or equivalent).

**Interval-loop model (current code):** Restart the session-reaper process:

```bash
pnpm --filter @udd/session-reaper dev
```

The process will begin its scan loop immediately on startup.

## Verifying scheduler/job linkage

1. Confirm the scheduler target points to the correct job name and revision.
2. Confirm the job's service account has database access.
3. Confirm the job's environment includes `DATABASE_URL` and `IDLE_THRESHOLD_SECONDS`.
4. Trigger a test invocation and confirm the job exits with code 0.
5. Check that idle sessions were reaped after the test run.

## Related runbooks

- [worker-failure.md](./worker-failure.md) — if session cleanup failures are caused by underlying worker or runtime failures
- [stale-preview-lease.md](./stale-preview-lease.md) — for individual stale preview diagnosis and manual revocation
- [local-runtime-failure.md](./local-runtime-failure.md) — if reaper issues appear during local development
