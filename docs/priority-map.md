# Priority Map

What needs to happen next, and where the current codebase is unstable or incomplete.

---

## Phase 3 boundary

Phase 3 (UI overhaul, design system, web shell, AI/ops surfaces) is **pending explicit user approval**. Do not implement Phase 3 work in advance.

Phase 3 intended scope (for planning purposes only — not authorized):
- Web app design system: Radix + Tailwind component library replacing scaffold UI
- Web shell: workspace/project navigation, code editor pane, session terminal, preview iframe
- AI pipeline authoring UI: visual DAG builder, run history, invocation logs
- Operational dashboards: worker health, session state, pipeline run monitoring

---

## High-value implementation gaps (Phase 2 complete, pre-Phase 3)

These are gaps that exist in the codebase now and are not blocked on Phase 3 approval.

### 1. mTLS between control and worker plane

**Impact:** Security — ADR 001 explicitly calls for mTLS enforcement on inter-plane traffic.  
**Current state:** All inter-plane traffic is plain HTTP.  
**Where to implement:** `apps/host-agent/src/agent.ts`, `apps/worker-manager/src/`, `infra/terraform/compute/`  
**Risk if deferred:** Sandbox-to-control-plane communication is not cryptographically authenticated.

### 2. Actual MicroVM provisioning on worker hosts

**Impact:** Core functionality — the session model describes MicroVM-per-session isolation (ADR 004). Port allocation is wired; actual VM creation is not.  
**Current state:** `apps/host-agent/src/agent.ts` reports capacity and heartbeats. It does not spin up Firecracker VMs.  
**Where to implement:** `apps/host-agent/src/agent.ts`  
**Risk if deferred:** Sessions are allocated a port but no isolated execution environment is created. User code has no sandbox.

### 3. Billing adapter integration

**Impact:** Revenue — usage events are correctly recorded. The `BillingProvider` adapter boundary exists. Nothing is connected.  
**Current state:** `packages/adapters/src/billing.ts` interface stub; `apps/usage-meter/src/index.ts` records events locally but does not upload.  
**Where to implement:** `packages/adapters/src/billing.ts` (real implementation), `apps/usage-meter/src/index.ts` (upload loop)

### 4. Partitioned table maintenance automation

**Impact:** Operational — `audit_logs`, `usage_meter_events`, `pipeline_runs` are range-partitioned by time. Monthly partitions must be created ahead of time.  
**Current state:** Partitions exist for the current period; creation is manual.  
**Where to implement:** Scheduled job or `pg_partman` extension configuration.  
**Risk if deferred:** Inserts into unprepared partition range will fail.

### 5. Android companion app

**Impact:** Platform coverage — `apps/mobile-android` is a skeleton with no real screens.  
**Current state:** Gradle project structure, no implemented screens.  
**Where to implement:** `apps/mobile-android/`  
**Note:** iOS companion is complete and defines the scope: monitor/review/collaborate — no IDE parity, no editor, no file browser.

### 6. `model_invocation_logs` read surface

**Impact:** Observability — invocation logs are written correctly. No endpoints expose them.  
**Current state:** Write path in `apps/ai-orchestration/src/routes/runs.ts`; no GET endpoint or pagination.  
**Where to implement:** `apps/ai-orchestration/src/routes/` — add read endpoints.

---

## Unstable areas

Approach with care; these areas are likely to change significantly.

| Area | Why unstable | What to avoid |
|------|-------------|---------------|
| Web app UI components (`apps/web/src/components/`) | Phase 3 will replace these with a design system. Current components are scaffold-only. | Heavy investment in current component structure |
| Host agent VM lifecycle (`apps/host-agent/src/agent.ts`) | MicroVM integration not implemented. Structure will change when real VM provisioning is added. | Tightly coupling orchestrator to host-agent internals |
| Infrastructure target (AWS vs GCP) | Terraform targets GCP; application adapters support both AWS and GCP. The deployment target is not definitively locked in documentation. | Hardcoding AWS or GCP SDK calls outside the adapters layer |
| Android companion (`apps/mobile-android/`) | Not started beyond skeleton. Architecture decisions not made. | Assuming iOS patterns will directly map to Android |
| `model_invocation_logs` query surface | Write path exists; read surface not designed. Schema or access patterns may change. | Building external integrations against direct DB queries |

---

## Infrastructure ambiguity to resolve

The README states AWS infrastructure. The actual Terraform deploys to GCP. The application adapters support both. This creates ambiguity when:
- Writing new runbooks (which CLI tools to reference)
- Adding new infrastructure resources (which provider to use)
- Configuring secret management in production

**Resolution needed:** Decide the canonical production infrastructure target (GCP vs AWS) and update README, runbooks, and Terraform to reflect a single consistent answer.
