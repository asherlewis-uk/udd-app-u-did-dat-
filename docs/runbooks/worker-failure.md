# Runbook: Worker Host Failure

## Symptoms
- Sessions in `running` state but no heartbeat from worker host for > 2× heartbeat interval
- Preview routes bound to the failed host returning 502/504
- `worker.unhealthy` events in the event log

## Immediate Actions

1. **Check worker health dashboard** — confirm which hosts are unhealthy (Ops > Workers).
2. **Check host-agent logs** on the affected host:
   ```bash
   aws ecs describe-tasks --cluster udd-prod-worker-plane --tasks <task-id>
   ```
3. **Mark host unhealthy** in worker-manager if not already done:
   - The worker-manager will mark as unhealthy after missed heartbeats automatically.
   - Manual override: call `POST /internal/workers/{host}/mark-unhealthy` (internal endpoint).

## Session Recovery

4. **Find sessions on the failed host**:
   ```sql
   SELECT id, project_id, user_id, state FROM sessions
   WHERE worker_host = '<failed-host>' AND state IN ('running', 'idle', 'starting');
   ```
5. **Transition sessions to `failed`** state via the orchestrator admin endpoint.
6. **Revoke all preview routes** bound to the failed host:
   ```sql
   UPDATE preview_routes SET state = 'revoked', revoked_at = NOW()
   WHERE worker_host = '<failed-host>' AND state = 'active';
   ```
7. **Notify users** — the collaboration service will push a `session_terminated` event to connected clients.

## Lease Cleanup

8. **Mark orphaned leases**:
   ```sql
   UPDATE sandbox_leases SET lease_state = 'orphaned'
   WHERE worker_host = '<failed-host>' AND lease_state IN ('active', 'pending');
   ```

## Host Recovery

9. If the host recovers, restart the `host-agent` service. It will re-register and report clean capacity.
10. If the host is permanently lost, remove it from the worker pool and provision a replacement.

## Post-Incident

- Review why heartbeat was missed (OOM, network partition, host OS crash).
- Check if session-reaper detected the orphaned leases in time.
- File incident report if user data was lost.
