# Observability

Back to [docs/_INDEX.md](./_INDEX.md).

## Canonical scope

Observability must answer five questions:

1. Is the hosted product up for web and iOS users?
2. Can hosted sessions start, stay healthy, and expose previews?
3. Are provider-backed AI requests succeeding without leaking secrets?
4. Can operators diagnose failures in hosted mode and in local development mode?
5. Can an agent or human map a symptom to a runbook quickly?

## Logs

### Current implementation

- `packages/observability/src/logger.ts` emits newline-delimited JSON logs.
- Log level comes from `LOG_LEVEL`.
- Correlation IDs are expected on inbound and outbound requests.
- Non-production logs may include stack traces.

### Required rules

- Every request-facing service must emit a correlation ID.
- Secrets, API keys, provider credentials, and passwords must never appear in logs.
- Web and iOS initiated requests must be traceable through the hosted API and downstream services via correlation IDs.

## Metrics

### Current implementation

- `packages/observability/src/metrics.ts` defines named platform metrics.
- The default implementation is noop unless a real exporter is wired at startup.

### Canonical metrics to preserve

| Metric family | Why it matters |
|---|---|
| Session startup latency | Detect runtime allocation regressions |
| Sandbox start duration | Detect hosted runtime startup problems |
| Preview bind latency and preview error rate | Detect preview breakage |
| Preview authorization deny rate | Distinguish auth failures from runtime failures |
| Worker capacity exhaustion | Detect hosted runtime saturation |
| Secret rotation outcome | Detect credential-management failures |
| Pipeline run transition latency | Detect stuck or slow AI runs |
| Model invocation outcome | Detect provider outages and rate-limit spikes |

## Traces

### Current implementation

- `packages/observability/src/tracing.ts` provides lightweight correlation and span helpers.
- This is not a full OpenTelemetry deployment by itself.

### Canonical rule

- Trace context must be propagated across service-to-service HTTP calls.
- If real tracing is added later, it must preserve current correlation ID behavior rather than replace it with an incompatible scheme.

## Core alerts

| Alert or symptom | Trigger | Mode | Runbook |
|---|---|---|---|
| Hosted API or gateway unavailable | Health checks fail or public traffic errors spike | Hosted | [worker-failure.md](./runbooks/worker-failure.md) or service-specific hosting investigation |
| Preview failures spike | Preview 4xx or 5xx rise unexpectedly | Hosted | [stale-preview-lease.md](./runbooks/stale-preview-lease.md) |
| Session startup stalls | Sessions remain in `creating` or `starting` too long | Hosted | [worker-failure.md](./runbooks/worker-failure.md) |
| Pipeline runs stall | Runs remain in `preparing` or `running` beyond threshold | Hosted | [stuck-pipeline-run.md](./runbooks/stuck-pipeline-run.md) |
| Secret rotation fails | Secret writes or reads fail | Hosted and local | [secret-rotation.md](./runbooks/secret-rotation.md), [provider-adapter-failure.md](./runbooks/provider-adapter-failure.md) |
| Local runtime will not boot | Local services fail to start or bind ports | Local | [local-runtime-failure.md](./runbooks/local-runtime-failure.md) |
| Docs contradict each other | Canonical docs and stale docs diverge | All | [docs-source-of-truth-drift.md](./runbooks/docs-source-of-truth-drift.md) |

## Local vs hosted monitoring

### Hosted mode

- Monitor public API and gateway health first.
- Monitor runtime capacity and stale heartbeats next.
- Monitor provider invocation success and stuck pipeline runs.
- Monitor secret rotation and auth exchange failures.

### Local mode

- Monitor process boot, DB and Redis connectivity, and port collisions.
- Validate web and iOS can reach the expected local API and gateway URLs.
- Use structured logs and local health endpoints before assuming a hosted-only issue.

## Current implementation notes

- The repo defines a good logging and correlation baseline.
- Metrics and traces are only partially wired; many alert conditions still require log-based or DB-based diagnosis rather than exported metrics.
- Hosted observability is stronger in intent than in implementation. Treat missing dashboards, exporters, or alert plumbing as implementation gaps, not as hidden features. See [docs/implementation-gaps.md](./implementation-gaps.md).
