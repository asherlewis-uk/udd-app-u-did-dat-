# Runbook: Worker Host Failure

## Symptoms

- Sessions in `running` or `idle` state but no heartbeat from worker host for > 2× heartbeat interval (default: > 60s)
- Preview routes bound to the failed host returning 502/504
- `WORKER_UNHEALTHY` events in the event log

## Immediate Actions

**1. Confirm which hosts are unhealthy:**

```bash
# GCP Cloud Run — list running instances of host-agent
gcloud run services describe udd-prod-host-agent --region=europe-west1 --format=json | jq '.status.observedGeneration'

# Check worker_capacity table for stale heartbeats
psql $DATABASE_URL -c "
  SELECT host, last_heartbeat_at, available_capacity,
         NOW() - last_heartbeat_at AS time_since_heartbeat
  FROM worker_capacity
  ORDER BY last_heartbeat_at ASC;
"
```

**2. Check host-agent logs (GCP Cloud Run):**

```bash
gcloud logging read 'resource.type="cloud_run_revision" resource.labels.service_name="udd-prod-host-agent"' \
  --limit=50 --format=json | jq '.[] | .textPayload'
```

**3. Mark host unhealthy** — the worker-manager does this automatically after missed heartbeats. Manual override via internal endpoint:

```bash
curl -X POST http://worker-manager-internal/internal/workers/{host}/mark-unhealthy
```

## Session Recovery

**4. Find sessions stranded on the failed host:**

```sql
SELECT id, project_id, user_id, state, worker_host, host_port
FROM sessions
WHERE worker_host = '<failed-host>'
  AND state IN ('running', 'idle', 'starting');
```

**5. Transition stranded sessions to `failed`** via orchestrator admin endpoint (or directly if orchestrator is also unavailable):

```sql
UPDATE sessions
SET state = 'failed', updated_at = NOW(), version = version + 1
WHERE worker_host = '<failed-host>'
  AND state IN ('running', 'idle', 'starting')
  AND version = <current_version>;
```

After the SQL update, also emit `SESSION_STATE_CHANGED` events or restart the orchestrator to trigger event reconciliation.

**6. Revoke all preview routes bound to the failed host:**

```sql
UPDATE preview_routes
SET state = 'revoked', revoked_at = NOW(), version = version + 1
WHERE worker_host = '<failed-host>'
  AND state = 'active';
```

**7. Notify affected users** — the collaboration service pushes `session_terminated` to connected WebSocket clients when `SESSION_TERMINATED` events arrive. Ensure events are emitted after step 5.

## Lease Cleanup

**8. Mark orphaned leases:**

```sql
UPDATE sandbox_leases
SET lease_state = 'orphaned', updated_at = NOW()
WHERE worker_host = '<failed-host>'
  AND lease_state IN ('active', 'pending');
```

## Host Recovery

**9. If the host recovers:** Restart the `host-agent` service. It will re-register with worker-manager and report clean capacity.

```bash
# GCP Cloud Run — redeploy to force a fresh instance
gcloud run services update udd-prod-host-agent \
  --region=europe-west1 \
  --update-env-vars=WORKER_HOST=<host-id>
```

**10. If the host is permanently lost:** Remove it from the Terraform worker pool and provision a replacement via `infra/terraform/compute/`.

## Post-Incident

- Review why heartbeat was missed: OOM kill, network partition, host OS crash, Cloud Run instance eviction
- Verify `session-reaper` detected orphaned leases in the next scan cycle (`IDLE_SESSION_SCAN_INTERVAL_MS`)
- Check if `WORKER_UNHEALTHY` alerting fired within 2× heartbeat interval
- File incident report if user data was lost or user code was interrupted without notice
