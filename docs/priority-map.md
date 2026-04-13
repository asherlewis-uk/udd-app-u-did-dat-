# Priority Map

What needs to happen next, and where the current codebase is unstable or incomplete.

---

## Phase 3 boundary

Phase 3 (UI overhaul, design system, web shell, AI/ops surfaces) is **pending explicit user approval**. Do not implement Phase 3 work without approval.

Phase 3 intended scope (not authorized — for planning only):
- Web app design system: Radix + Tailwind component library
- Web shell: workspace/project navigation, session terminal, preview iframe, code editor pane
- AI pipeline authoring UI: visual DAG builder, run history, invocation log viewer
- Operational dashboards: worker health, session state, pipeline run monitoring

---

## High-value implementation gaps (Phase 2 complete, pre-Phase 3)

### 1. Host agent real capacity measurement

**Impact:** Correctness — the orchestrator allocates sandbox ports based on data reported by host agents. Currently `collectCapacitySnapshot()` in `apps/host-agent/src/agent.ts` returns hardcoded values (10 slots, ports 32100–32109, always healthy). No actual OS or container runtime is queried.  
**Code location of stub:** `apps/host-agent/src/agent.ts`, `collectCapacitySnapshot()` function, with TODO comment: `"Phase 2: query the host OS / container runtime for actual state"`  
**Risk:** The orchestrator allocates ports that may not actually be available on the worker host. Port conflicts at the sandbox level are silent.

### 2. MicroVM provisioning on worker hosts

**Impact:** Core security — ADR 004 requires a MicroVM per session. Port allocation works. No VM is created.  
**Current state:** Host agent heartbeats and registers. It does not spin up Firecracker VMs or any equivalent. The `starting` → `running` session state transition occurs via the orchestrator DB write, not via a VM boot confirmation.  
**Code location:** `apps/host-agent/src/agent.ts` — VM lifecycle responsibilities are listed in the comment header but have no implementation  
**Risk:** User code runs with no sandbox isolation. This is a security gap if real user traffic is served.

### 3. mTLS between control and worker planes

**Impact:** Security — ADR 001 specifies mTLS enforcement. The comment in `apps/worker-manager/src/app.ts` explicitly notes `"mTLS in prod"` as the planned auth mechanism for the `/internal/capacity-snapshot` endpoint. Currently unenforced.  
**Risk:** The worker-manager accepts capacity snapshots from any caller on the VPC without authentication.

### 4. `WORKER_UNHEALTHY` event emission

**Impact:** Operational visibility — the event topic exists in contracts. The current worker-manager and host-agent code does not emit it. Unhealthy worker detection only surfaces passively at lease allocation time when `findHealthyWithLock()` finds no healthy workers.  
**Risk:** Operators have no proactive alert when a worker host stops heartbeating. Detection latency equals the next allocation attempt.

### 5. Billing adapter integration

**Impact:** Revenue — usage events are recorded. `StripeBillingProvider` in `packages/adapters/src/billing.ts` has all methods throwing `NotImplementedError`. `usage-meter` records events locally but does not upload to billing.  
**Code location:** `packages/adapters/src/billing.ts` (all methods stub), `apps/usage-meter/src/index.ts` (upload loop missing)

### 6. `model_invocation_logs` read surface

**Impact:** Observability — write path is implemented and correct. No read endpoints expose invocation history.  
**Code location:** `apps/ai-orchestration/src/routes/` — add GET endpoint with pagination.

### 7. Partitioned table maintenance

**Impact:** Operational — `audit_logs`, `usage_meter_events`, `pipeline_runs` are range-partitioned by time. `docs/runbooks/db-migration-rollout.md` documents manual partition creation. No automation exists.  
**Risk:** Inserts into an uncreated partition range will fail silently or with a PostgreSQL error.

### 8. Android companion app completion

**Impact:** Platform coverage — `apps/mobile-android` has a real Compose tab UI (`MainActivity.kt`) and a real Ktor API client (`ApiClient.kt`) with two endpoints (`getMe`, `listWorkspaces`). The full companion scope (status/review/comments) is not yet implemented.  
**Scope comment in code:** `"Status/review/comments companion — NO code editor, NO terminal"`  
**Reference:** iOS companion (`apps/mobile-ios`) implements the full scope and is the implementation reference.

---

## Unstable areas

| Area | Why unstable | What to avoid |
|------|-------------|---------------|
| Web app UI components (`apps/web/src/components/`) | Phase 3 will replace these with a design system | Heavy investment in current layout |
| Host agent VM lifecycle | MicroVM integration not implemented; structure will change significantly | Tightly coupling orchestrator to host-agent internals before VM lifecycle is defined |
| Host agent port range | Currently hardcoded 32100–32109 per host; will change when real OS querying is added | Hardcoding this range anywhere except reading from `worker_capacity.available_ports` |
| Android companion full scope | Partial implementation; API surface not fully defined | Assuming iOS patterns map 1:1 to Android before Android scope is confirmed |
| `model_invocation_logs` query surface | No read endpoints exist; schema may evolve | Building external integrations against direct DB queries on this table |
| Infrastructure secrets selection | `NODE_ENV === 'production'` hardcoded in context.ts; no env var override | Adding a new `SECRET_MANAGER_PROVIDER` env var without also updating the context.ts check |
