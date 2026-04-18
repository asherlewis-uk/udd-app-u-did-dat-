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

> **Note:** The `workspace_id` column below reflects current implementation. The canonical model is project-first ([ADR 013](../adr/013-thin-workspace-migration-strategy.md)). The column remains as an internal shard key.

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

- Host-agent capacity reporting is real: CPU via `os.cpus()`, memory via `os.freemem()`/`os.totalmem()`, port availability via TCP probing. Slot allocation (`allocateSlot`/`releaseSlot`/`allocatePort`/`releasePort`) is in-memory bookkeeping only — no actual container is created or destroyed. Container-per-session isolation ([ADR 014](../adr/014-container-per-session-isolation.md)) is designed but not implemented. Full hosted worker failure diagnosis requires container-per-session implementation.
- Session reaper runs as a single-cycle-and-exit job (async `main()` that runs one cleanup cycle, closes the DB pool, and exits). Cloud Scheduler triggers every 5 min. If session-reaper cleanup appears stalled, check whether the scheduler trigger is firing.
- If the failure is local rather than hosted, use [local-runtime-failure.md](./local-runtime-failure.md).

**Deployment note (2026-04-18):** Only `ai-orchestration` and `worker-manager` are deployed to Cloud Run. Other runtime services (orchestrator, gateway, host-agent) are not deployed. This runbook applies primarily to local development and will become fully relevant once control-plane services are deployed.
