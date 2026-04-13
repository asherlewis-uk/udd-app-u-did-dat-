# Runbook: Stuck Pipeline Run

**Status:** Canonical  
Back to [docs/\_INDEX.md](../_INDEX.md).

## Symptoms

- Pipeline run remains in `queued`, `preparing`, or `running` much longer than expected
- Users report AI work never finishing
- Provider calls or run state transitions stop appearing in logs

## Diagnosis

> **Note:** The `workspace_id` column below reflects current implementation. The canonical model is project-first ([ADR 013](../adr/013-thin-workspace-migration-strategy.md)). The column remains as an internal shard key.

```sql
SELECT id, pipeline_id, workspace_id, status, started_at, finished_at, error_summary
FROM pipeline_runs
WHERE status IN ('queued', 'preparing', 'running')
ORDER BY started_at NULLS FIRST, created_at;
```

## Recovery

1. Inspect `ai-orchestration` logs for the run correlation ID.
2. Check provider availability and secret-manager health.
3. Cancel or fail the run if it is unrecoverable.

## Manual fail

```sql
UPDATE pipeline_runs
SET status = 'failed',
    error_summary = 'Manually failed by operator',
    finished_at = NOW(),
    updated_at = NOW()
WHERE id = '<pipeline-run-id>'
  AND status IN ('queued', 'preparing', 'running');
```

## Follow-up

- If the root cause is provider connectivity or credential failure, use [provider-adapter-failure.md](./provider-adapter-failure.md).
- If the root cause is docs or workflow drift around AI services, log it in [docs/implementation-gaps.md](../implementation-gaps.md).
