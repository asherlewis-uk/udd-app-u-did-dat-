# Runbook: Session Reaper Failure

**Status:** Canonical  
Back to [docs/\_INDEX.md](../_INDEX.md).

## Canonical model

Session reaper is a **scheduled single-invocation job** (not a long-running service). A scheduler trigger fires on a cadence; the reaper process runs once, cleans up idle sessions and orphaned leases, then exits. See [docs/runtime.md](../runtime.md) and [docs/service-catalog.md](../service-catalog.md).

> **Implementation note (2026-04-18):** Code has been refactored to single-cycle-and-exit mode: an async `main()` runs one cleanup cycle, closes the DB pool, and exits. Cloud Scheduler triggers every 5 min. The interval-loop model no longer applies.

## Use this runbook when

- idle sessions are not being cleaned up
- orphaned preview leases accumulate
- session-reaper logs stop appearing
- operators suspect the reaper job or process is stalled

## Diagnosis

### 1. Verify the scheduler trigger is firing

Check your scheduler platform (Cloud Run Jobs scheduler, cron trigger, or equivalent) for recent invocations. If the trigger has not fired:

- Confirm the scheduler is enabled and the schedule expression is correct (currently disabled in Terraform — see deployment note below).
- Confirm the job target (container image, service account, endpoint) is correctly configured.
- Check scheduler platform logs for auth or quota errors.

> **Note:** The interval-loop model has been removed. The reaper now runs as a single-cycle-and-exit process. If the reaper is not running, check the Cloud Scheduler trigger and Cloud Run Job configuration.

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

**Interval-loop model (removed):** The interval-loop model has been replaced by single-cycle-and-exit. To run a manual reaper cycle locally:

```bash
pnpm --filter @udd/session-reaper dev
```

The process will run one cleanup cycle and exit.

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

**Deployment note (2026-04-18):** The session-reaper Cloud Run Job and Cloud Scheduler trigger are disabled in Terraform. The reaper code is refactored to single-cycle-and-exit but has no deployed infrastructure. This runbook applies to local development only until the job is re-enabled.
