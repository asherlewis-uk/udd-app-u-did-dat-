# Runbook: Stuck Pipeline Run

## Symptoms
- Pipeline run shows `status = 'preparing'` or `status = 'running'` for longer than expected
- `pipeline_run.status_changed` events stopped appearing in the audit log
- User reports a pipeline has been running for hours

## Diagnosis

```sql
-- Find stuck runs
SELECT id, pipeline_id, workspace_id, status, started_at,
       NOW() - started_at AS duration, error_summary
FROM pipeline_runs
WHERE status IN ('preparing', 'running')
  AND started_at < NOW() - INTERVAL '30 minutes'
ORDER BY started_at ASC;
```

## Automatic Recovery

The `ai-orchestration` service has a scheduled job (`stuckRunRecovery`) that:
1. Finds runs in `preparing`/`running` state beyond `STUCK_RUN_TIMEOUT_MS`.
2. Marks them as `failed` with `errorSummary = 'Recovered by stuck-run detector'`.
3. Emits `pipeline_run.status_changed` event.

Verify the job is running:
```bash
aws logs tail /ecs/udd-prod-ai-orchestration --filter-pattern 'stuck_run'
```

## Manual Recovery

If automatic recovery is not triggering:

```sql
-- Mark stuck runs as failed
UPDATE pipeline_runs
SET status = 'failed',
    error_summary = 'Manually marked failed by operator',
    finished_at = NOW(),
    updated_at = NOW()
WHERE id IN ('<run-id-1>', '<run-id-2>')
  AND status IN ('preparing', 'running');
```

Then emit a `pipeline_run.status_changed` event manually or restart the `ai-orchestration` service.

## Root Cause Investigation

- Check `model_invocation_logs` for the affected runs — was the adapter call attempted?
- Check `ai-orchestration` service logs for errors during the run.
- Check if the secret manager was unreachable at the time of the run.
- Check if the provider endpoint was returning errors.

## Prevention

- Set `STUCK_RUN_TIMEOUT_MS` appropriately (default: 5 minutes).
- Alert on `pipeline_run_state_transition_latency_seconds` p99 > threshold.
