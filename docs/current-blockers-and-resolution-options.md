# Current Blockers and Resolution Options

Back to [docs/_INDEX.md](./_INDEX.md).

## Purpose

This is the canonical source of truth for the three active blockers preventing the UDD platform from reaching a stable hosted deployment. It presents evidence-based options and ranked recommendations. Every claim is traceable to files in this repo or to the verified GCP project state.

## Last Updated

Date: 2026-04-18

## Current State Summary

Two of nine backend services deploy to Cloud Run (`ai-orchestration`, `worker-manager`). Both are internal-only — there is no public ingress. The remaining seven services have Dockerfiles but no published images, no Cloud Build configs, and their Terraform resources are commented out. The load balancer and monitoring modules are disabled. GitHub Actions CI/CD references all nine services and targets the wrong registry (`gcr.io`) and the wrong region (`europe-west1`). No AWS infrastructure exists. The platform cannot serve traffic to users.

---

## Blocker 1: Broken Deployment Pipeline

### Evidence

1. **Registry mismatch.** GitHub Actions `build.yml` (line 10) and `deploy.yml` (line 10) push images to `gcr.io`. Cloud Build configs (`cloudbuild.ai.yaml`, `cloudbuild.worker.yaml`) and Terraform compute module (`modules/compute/main.tf` lines 163, 289) pull from `us-central1-docker.pkg.dev/acoustic-result-491711-t7/udd-images/`. These are different registries. Images built by GitHub Actions are invisible to Terraform-managed Cloud Run services.

2. **Region mismatch.** `deploy.yml` (line 11) hardcodes `GCP_REGION: europe-west1`. Terraform variables (`environments/dev/variables.tf` line 9) default to `us-central1`. All existing Cloud Run services are in `us-central1`. A deploy.yml run would attempt to create new services in the wrong region.

3. **Service scope mismatch.** `deploy.yml` (line 12) lists all seven services plus `session-reaper`. Terraform only provisions `ai-orchestration` and `worker-manager`. Running `deploy.yml` would attempt `gcloud run deploy` against five Cloud Run services that do not exist in Terraform state, creating unmanaged resources or failing outright.

4. **Build scope mismatch.** `build.yml` (lines 22-32) builds a matrix of all nine services including `host-agent`. All nine Dockerfiles exist, but the resulting images go to `gcr.io` where nothing reads them.

5. **Cloud Build coverage.** Only two Cloud Build configs exist in the repo root: `cloudbuild.ai.yaml` and `cloudbuild.worker.yaml`. These are the only path that correctly publishes to Artifact Registry. No Cloud Build configs exist for the other seven services.

6. **VPC connector drift.** The networking module (`modules/networking/main.tf` lines 106-120) defines the VPC Access connector with `network = google_compute_network.main.id` (self-link). If the GCP API returns this differently from what Terraform last stored, `terraform plan` shows a forced replacement on every apply. This is a config-drift nuisance that can cause downtime if applied carelessly.

### Why This Is A Blocker

There is no functioning end-to-end path from `git push` to a running Cloud Run service. The two working services (`ai-orchestration`, `worker-manager`) were deployed via manual Cloud Build triggers, not CI/CD. The GitHub Actions workflows will fail or create incorrect resources if triggered. You cannot ship features, fixes, or new services until this is resolved.

### Options

#### Option A: Repair current Cloud Run / Terraform / image publishing path

**What it means:** Fix `deploy.yml` and `build.yml` to use Artifact Registry (`us-central1-docker.pkg.dev`) and the correct region (`us-central1`). Create Cloud Build configs for remaining services. Fix VPC connector drift. Re-enable disabled Terraform resources as images become available.

**What it fixes:** Full CI/CD for all services. GitHub Actions becomes a working deployment pipeline. Terraform state and deployed resources converge.

**What it does not fix:** Does not confirm that the seven disabled services actually run correctly on Cloud Run (env vars, health endpoints, runtime behavior). Does not address the platform baseline question (Blocker 3).

**Risks:**
- HIGH blast radius — touches `.github/workflows/deploy.yml`, `.github/workflows/build.yml`, five to seven new `cloudbuild.*.yaml` files, `infra/terraform/modules/compute/main.tf`, `infra/terraform/modules/networking/main.tf`, and `infra/terraform/environments/dev/main.tf`.
- Each re-enabled service may have runtime issues beyond image availability: missing environment variables, untested health endpoints, broken package imports.
- VPC connector replacement during apply could briefly break VPC connectivity for running services.

**Blast radius:** HIGH. CI/CD, Terraform, Cloud Build, networking, and every service touched.

**Recommended use case:** Choose this if you are committed to Cloud Run as the hosting platform and want full pipeline coverage. Requires dedicated time to re-enable, test, and stabilize each service.

#### Option B: Narrow current infra scope to only proven services

**What it means:** Fix `deploy.yml` and `build.yml` to target only `ai-orchestration` and `worker-manager`, using the correct registry and region. Leave all other services disabled. Fix VPC connector drift. Do not create new Cloud Build configs.

**What it fixes:** CI/CD works end-to-end for the two services that are actually deployed. No risk of creating unmanaged resources. Terraform plan is clean.

**What it does not fix:** Five control-plane services and session-reaper remain undeployable. No public API, no preview gateway, no session orchestration. The platform cannot serve users.

**Risks:**
- LOW blast radius — only `deploy.yml`, `build.yml`, and potentially the networking module.
- Leaves the platform in a reduced state indefinitely. Every new service requires the same repair work later.

**Blast radius:** LOW. Two workflow files and one Terraform module.

**Recommended use case:** Choose this to stabilize CI/CD immediately while deferring the full service bring-up to a separate effort. This is essentially formalizing the current de facto state.

#### Option C: Stop investing in current path and migrate hosted control plane to App Runner

**What it means:** Create entirely new AWS infrastructure — Terraform modules for App Runner, ECR, VPC, RDS, ElastiCache, SQS. Rewrite CI/CD for AWS. Migrate secrets from GCP Secret Manager to AWS Secrets Manager. Decommission GCP resources.

**What it fixes:** Starts fresh with a potentially simpler hosting model if App Runner is a better fit.

**What it does not fix:** Everything. No AWS infrastructure exists today. Every component must be rebuilt from scratch.

**Risks:**
- VERY HIGH blast radius — every infrastructure file, every CI/CD workflow, every secret reference, every queue provider configuration.
- Months of work before reaching parity with the current broken-but-partially-working GCP state.
- The application code has GCP-specific integrations: Secret Manager (`packages/adapters`), Pub/Sub (`packages/events`), GCS (`packages/adapters`). These would need adapter implementations for AWS equivalents.
- ADR 014 is vendor-neutral, but the entire infra implementation is GCP. Migration is a rearchitecture, not a port.

**Blast radius:** VERY HIGH. Everything.

**Recommended use case:** Choose this only if there is a compelling strategic reason to leave GCP (cost, compliance, team expertise) that justifies months of rearchitecture work with zero user-facing progress in the interim.

### Recommendation Ranking

| Rank | Option | Best for | Tradeoff |
|------|--------|----------|----------|
| **1** | **B — Narrow scope to proven services** | Fastest stabilization | Leaves platform half-built, but CI/CD works for what exists |
| **2** | **A — Repair full Cloud Run path** | Lowest rework long-term | High blast radius, each service needs individual validation |
| **3** | C — Migrate to App Runner | Only if GCP is strategically wrong | Months of work, zero user-facing value in the interim |

**If fastest stabilization and lowest rework differ:** They do. Option B is fastest. Option A is lowest total rework because every deferred service will need the same repair work later — doing it once is cheaper than doing it incrementally. The recommended sequence is B first (stabilize what works today), then A (expand scope service by service).

---

## Blocker 2: Control-Plane Services Not Deployable on Current Infra

### Evidence

1. **Five services plus one job are commented out.** `modules/compute/main.tf` lines 26-54 (locals), 67-137 (Cloud Run resource), 205-215 (IAM), 223-263 (session-reaper job), 338-360 (scheduler). Each block has a TODO comment: *"Re-enable after publishing images to Artifact Registry."*

2. **No images exist in Artifact Registry for these services.** Only `ai-orchestration` and `worker-manager` images exist at `us-central1-docker.pkg.dev/acoustic-result-491711-t7/udd-images/`.

3. **No Cloud Build configs exist for these services.** Only `cloudbuild.ai.yaml` and `cloudbuild.worker.yaml` are in the repo root.

4. **Dockerfiles exist for all services.** Every service under `apps/` has a `Dockerfile`. Whether these Dockerfiles produce working images for Cloud Run is unverified.

5. **Each service has specific port and visibility requirements.** From the commented-out Terraform locals: `api` (port 8080, public), `gateway` (port 3000, public), `orchestrator` (port 3002, internal), `collaboration` (port 3003, internal), `usage-meter` (port 3006, internal), `session-reaper` (Cloud Run Job, no port).

6. **Service dependencies are documented.** From `docs/service-catalog.md`: `api` depends on `orchestrator` and `ai-orchestration`. `gateway` depends on `auth` and `database`. `orchestrator` depends on `database` and `events`. Bringing up services in the wrong order may produce startup failures.

7. **Two services are optional/dormant.** `collaboration` is explicitly marked "frozen as dormant" in the service catalog. `usage-meter` is marked "Optional". Neither is required for core platform functionality.

### Why This Is A Blocker

The platform has no public API (`api`), no preview gateway (`gateway`), and no session lifecycle management (`orchestrator`). Without these three core services, no user-facing functionality works. The hosted platform is inert.

### Options

#### Option A: Build and publish all missing service images

**What it means:** Create Cloud Build configs for all seven remaining services. Build each Dockerfile, push to Artifact Registry, and verify images run on Cloud Run. Un-comment their Terraform resources. Wire environment variables, service accounts, and health endpoints.

**What it fixes:** All services deployable. Platform functionally complete.

**What it does not fix:** Does not guarantee runtime correctness. Each service may have missing env vars, broken package imports, or untested Cloud Run behavior.

**Risks:**
- Each service needs individual validation: correct port binding, health endpoint responding, database connectivity via VPC connector, event publishing to Pub/Sub.
- `api` and `gateway` are public-facing — re-enabling them also requires re-enabling the load balancer module, SSL certificate, and DNS. That is a separate infrastructure effort.
- `collaboration` uses WebSockets. Cloud Run has a 60-minute request timeout and limited WebSocket support. This may not work without architectural changes.
- Estimated effort: 1-2 days per service for build + deploy + validate, more for `gateway` (preview proxy logic) and `collaboration` (WebSocket constraints).

**Blast radius:** MEDIUM per service, HIGH cumulative.

**Recommended use case:** Choose this if you want the full platform running. Execute incrementally, not all at once.

#### Option B: Remove or disable undeployable services from active infra definition until ready

**What it means:** The Terraform resources are already commented out. Extend this cleanup to GitHub Actions: remove undeployable services from the `SERVICES` list in `deploy.yml` and the build matrix in `build.yml`. Make the active infra definition match reality.

**What it fixes:** CI/CD stops failing or building unnecessary images. Terraform state is clean. The repo honestly reflects what is deployed.

**What it does not fix:** Platform is still missing core services. No public API, no preview, no orchestration.

**Risks:**
- LOW blast radius — workflow files only.
- Risk of "out of sight, out of mind" — services stay broken indefinitely without active work to bring them up.

**Blast radius:** LOW.

**Recommended use case:** Choose this as an immediate cleanup step, paired with an explicit plan and timeline for bringing services online.

#### Option C: Re-scope hosted v1 around only the services that are actually deployable

**What it means:** Define the hosted MVP as `ai-orchestration` + `worker-manager` only. Everything else (API, gateway, orchestrator, session lifecycle) runs locally or is deferred to a later milestone. Users interact with the platform only through local development mode.

**What it fixes:** Eliminates the blocker by redefining the goal. What's deployed is what's shipped.

**What it does not fix:** The product is "solo-first, hosted-first" (ADR 007). Removing hosted public services contradicts the product model. Local-only means no hosted preview, no hosted AI pipeline access for end users, no multi-device access.

**Risks:**
- LOW blast radius technically, but HIGH product risk.
- `ai-orchestration` and `worker-manager` alone are not a product. They are internal services with no user-facing entry point.
- This effectively abandons the "hosted-first" commitment from ADR 007.

**Blast radius:** LOW (infra), HIGH (product direction).

**Recommended use case:** Choose this only as a temporary time-box while actively building toward Option A. Do not choose this as a permanent state — it is incompatible with the product model.

### Recommendation Ranking

| Rank | Option | Best for | Tradeoff |
|------|--------|----------|----------|
| **1** | **B — Disable undeployable services from CI/CD** | Fastest stabilization | Honest about current state, but requires follow-up plan |
| **2** | **A — Build and publish all missing images** | Lowest rework, long-term coherence | High effort, each service needs individual validation |
| **3** | C — Re-scope hosted v1 to deployed services only | Unblocking if time-pressured | Contradicts product model, not a real product |

**Recommended sequence:** B immediately (clean up CI/CD), then A incrementally — prioritize `api` → `orchestrator` → `gateway` → `session-reaper`, defer `collaboration` and `usage-meter`.

---

## Blocker 3: Platform Baseline Decision Still Unstable

### Evidence

1. **Cloud Run is the only platform with any implementation.** All Terraform modules target GCP. Compute module uses `google_cloud_run_v2_service`. Networking uses GCP VPC, Cloud NAT, Serverless VPC Access connector. Database is Cloud SQL PostgreSQL 16. Cache is Memorystore Redis. Queues are Pub/Sub with dead-letter topics. Secrets use GCP Secret Manager API.

2. **Application code has GCP-specific integrations.** `packages/adapters` references GCP Secret Manager. `packages/events` defaults to Pub/Sub (SQS adapter exists but is not tested against GCP infrastructure). GCS bucket exists for object storage.

3. **ADR 014 is deliberately vendor-neutral.** It says: *"This ADR does not prescribe a specific vendor or product (e.g., Cloud Run, ECS, Kubernetes)."* But the implementation is 100% Cloud Run. The vendor-neutrality is in the ADR text, not in the code.

4. **No AWS infrastructure exists.** No AWS Terraform modules, no ECR registry, no App Runner or ECS configuration, no RDS instance, no ElastiCache cluster, no SQS queue configuration, no AWS Secrets Manager integration. The entire `infra/` directory is GCP.

5. **Queue provider has adapter flexibility.** `packages/events` supports both Pub/Sub and SQS as providers. However, only Pub/Sub is wired in the Terraform infrastructure. Switching to SQS would require new AWS infrastructure for the queue layer.

6. **Secret manager is GCP-only.** The secrets Terraform module (`modules/secrets/main.tf`) enables only `secretmanager.googleapis.com`. `packages/adapters` implements GCP Secret Manager. No AWS Secrets Manager adapter is evident.

### Why This Is A Blocker

Indecision about the hosting platform prevents confident investment in infrastructure. Every hour spent fixing Cloud Run CI/CD is wasted if the decision is to migrate to AWS. Every hour spent planning an AWS migration is wasted if Cloud Run is the right answer. The sunk cost in GCP is significant — ten Terraform modules, two working services, VPC networking, database, cache, queues, secrets. But sunk cost should not drive the decision; fit should.

### Options

#### Option A: Commit to App Runner as hosted control-plane baseline

**What it means:** Build new AWS Terraform modules for App Runner, ECR, VPC, RDS PostgreSQL, ElastiCache Redis, SQS, AWS Secrets Manager. Rewrite all CI/CD. Implement AWS adapter for secrets. Test SQS adapter against real infrastructure. Migrate or recreate database. Decommission GCP.

**What it fixes:** Potentially simpler container deployment model if App Runner's opinions align with UDD's needs. AWS ecosystem access.

**What it does not fix:** Everything currently working stops working. Months of rebuilding before reaching current state.

**Risks:**
- VERY HIGH effort. Ten Terraform modules to rewrite. CI/CD to rebuild. Adapter code to write and test.
- App Runner has limitations: no VPC connector equivalent (uses VPC Connector but with different semantics), limited concurrency control, no job execution (would need Lambda or Step Functions for session-reaper), limited WebSocket support.
- Team has existing GCP knowledge embedded in the codebase. AWS migration introduces a learning curve.
- Zero user-facing progress during migration.

**Blast radius:** TOTAL. Every infrastructure file, CI/CD workflow, adapter implementation, and environment variable reference.

**Recommended use case:** Only if there is a specific, articulable reason why GCP Cloud Run cannot meet UDD's hosting requirements that App Runner can.

#### Option B: Commit to ECS/Fargate as canonical hosted baseline

**What it means:** Same as Option A but targeting ECS/Fargate instead of App Runner. More flexible than App Runner but more complex to configure.

**What it fixes:** Full container orchestration with fine-grained control. Native support for jobs (ECS tasks), service discovery, load balancing.

**What it does not fix:** Same as Option A — everything currently working stops working.

**Risks:**
- Same as Option A with additional Terraform complexity (ECS task definitions, services, target groups, ALB, service discovery).
- ECS is more operationally complex than Cloud Run or App Runner. More knobs to tune, more resources to manage.
- Fargate pricing may be higher than Cloud Run's scale-to-zero for a low-traffic platform.

**Blast radius:** TOTAL.

**Recommended use case:** Only if you need capabilities that neither Cloud Run nor App Runner provides (complex scheduling, sidecar containers, custom networking). Not justified by current requirements.

#### Option C: Continue on Cloud Run and explicitly reject AWS migration

**What it means:** Declare Cloud Run as the canonical hosted compute platform. Close the vendor-neutral ambiguity in ADR 014 by recording this decision. Invest fully in fixing the Cloud Run deployment pipeline (Blocker 1) and bringing all services online (Blocker 2).

**What it fixes:** Eliminates decision paralysis. Every infrastructure investment is unambiguously justified. The existing ten Terraform modules, VPC networking, database, cache, queues, and secrets become confirmed long-term assets, not sunk costs.

**What it does not fix:** If Cloud Run has genuine limitations for UDD's workload (WebSocket support for collaboration, cold start latency for session orchestration, job scheduling for session-reaper), those limitations are now accepted rather than avoided.

**Risks:**
- LOW blast radius — only docs need updating (ADR 014 amendment or new ADR).
- Cloud Run's 60-minute request timeout limits WebSocket-based collaboration. Workaround: use Pub/Sub for real-time fan-out instead of persistent WebSocket connections.
- Cloud Run Jobs for session-reaper works but has limited scheduling flexibility compared to dedicated job schedulers.
- Vendor lock-in to GCP. Acceptable for a solo-first product where operational simplicity matters more than multi-cloud portability.

**Blast radius:** MINIMAL. One ADR update.

**Recommended use case:** Choose this. The evidence overwhelmingly supports it.

#### Option D: Split baseline by workload class

**What it means:** Use Cloud Run for the control plane (API, gateway, orchestrator, AI orchestration). Use a different platform (e.g., GKE, Fly.io, or a dedicated VM) for worker-plane containers where per-session isolation with longer lifetimes is needed.

**What it fixes:** Optimizes each workload class for its execution characteristics. Control plane benefits from scale-to-zero. Worker containers benefit from longer-running instances with persistent filesystems.

**What it does not fix:** Adds operational complexity. Two compute platforms to manage, monitor, and deploy to.

**Risks:**
- MEDIUM blast radius — new Terraform modules for the worker platform, split CI/CD.
- Operational overhead of two compute platforms for a solo developer.
- ADR 014's container-per-session model may eventually require a worker platform anyway, but that is a future concern — no session containers exist today.

**Blast radius:** MEDIUM. New modules, split CI/CD.

**Recommended use case:** Consider this only after the control plane is stable on Cloud Run and the container-per-session model is being implemented. Premature to split now.

### Recommendation Ranking

| Rank | Option | Best for | Tradeoff |
|------|--------|----------|----------|
| **1** | **C — Commit to Cloud Run, reject AWS migration** | Fastest stabilization, lowest rework, long-term coherence | Accepts Cloud Run limitations (WebSocket, cold start) |
| **2** | D — Split baseline by workload class | Future optimization | Premature complexity, revisit when session containers are real |
| **3** | A — App Runner | Only if GCP is strategically wrong | Months of rearchitecture, zero progress |
| **4** | B — ECS/Fargate | Only if complex orchestration needed | Even more rearchitecture than App Runner |

**All three criteria align.** Fastest stabilization, lowest rework, and long-term coherence all point to Option C. This is rare. Take it.

---

## Resolution Sequence

```
Step 1: Resolve Blocker 3 (platform baseline decision)
        → Commit to Cloud Run (Option C)
        → Update ADR 014 or create ADR 015 to record the decision
        → Time: 1 hour
        → This unblocks confident investment in Steps 2 and 3

Step 2: Resolve Blocker 1 (deployment pipeline) — partial
        → Narrow CI/CD scope to proven services (Option B)
        → Fix registry: gcr.io → us-central1-docker.pkg.dev in deploy.yml and build.yml
        → Fix region: europe-west1 → us-central1 in deploy.yml
        → Fix service list: only ai-orchestration and worker-manager
        → Fix VPC connector drift in networking module
        → Time: 2-4 hours
        → Result: CI/CD works end-to-end for deployed services

Step 3: Resolve Blocker 2 (missing services) — incremental
        → Build and publish images one service at a time (Option A)
        → Priority order: api → orchestrator → gateway → session-reaper
        → For each: create Cloud Build config, build image, un-comment Terraform,
          validate on Cloud Run, wire env vars
        → Defer: collaboration (dormant), usage-meter (optional)
        → Time: 1-2 days per service
        → Re-enable load balancer after api + gateway are live
        → Re-enable monitoring after api + gateway + orchestrator are live

Step 4: Resolve Blocker 1 (deployment pipeline) — full
        → Expand CI/CD scope as services come online
        → Each service added to deploy.yml and build.yml as it passes validation
        → Time: integrated into Step 3
```

Steps 1 and 2 can be done in the same session. Step 3 is the bulk of the work. Step 4 is incremental alongside Step 3.

**Critical path:** Step 1 → Step 2 → Step 3 (api) → Step 3 (orchestrator) → Step 3 (gateway) → load balancer re-enable. This is the minimum path to a platform that can serve users.

## Decision Quality Notes

1. **Sunk cost acknowledged.** Ten GCP Terraform modules exist. This is not a reason to stay on GCP — but it is a reason to require a strong justification before leaving. No such justification has been presented.

2. **Vendor-neutrality in ADR 014 is aspirational, not real.** The code is 100% GCP. Maintaining the fiction of vendor-neutrality costs decision clarity. The recommendation is to name the vendor explicitly.

3. **"Do everything" is not recommended.** Bringing all nine services online simultaneously has high blast radius and high failure probability. Incremental service bring-up with validation gates is the only responsible approach.

4. **Collaboration service may not work on Cloud Run.** WebSocket support on Cloud Run is limited. This is acceptable because collaboration is frozen as dormant and not required for the hosted MVP. If collaboration becomes active, evaluate Cloud Run's WebSocket limitations at that time.

5. **The two deployed services have no public ingress.** Both `ai-orchestration` and `worker-manager` are `INGRESS_TRAFFIC_INTERNAL_ONLY`. They are running but unreachable from outside GCP. The platform does not serve traffic until `api` and `gateway` are deployed and the load balancer is re-enabled.

6. **GitHub Actions and Cloud Build are redundant.** `deploy.yml` does its own `docker build` and `gcloud run deploy`. Cloud Build configs do `docker build` and push to Artifact Registry. These are two separate build paths for the same services. The recommendation is to consolidate — but that is a follow-up optimization, not a blocker.

7. **This document will go stale.** Update it as blockers are resolved. Remove resolved blockers. Add new ones if they emerge. If all three are resolved, archive this document.
