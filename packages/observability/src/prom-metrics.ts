// ============================================================
// Prometheus-backed metrics implementations using prom-client.
// Call createPromMetrics() at production startup and pass to
// setMetrics() to enable real metric collection.
// ============================================================

import * as promClient from 'prom-client';
import type { Counter, Histogram, Gauge, LabelSet, PlatformMetrics } from './metrics.js';

// ============================================================
// Adapters — thin wrappers that satisfy our interfaces
// ============================================================

export class PromCounter implements Counter {
  private readonly inner: promClient.Counter;

  constructor(config: promClient.CounterConfiguration<string>) {
    this.inner = new promClient.Counter(config);
  }

  inc(labels?: LabelSet, value?: number): void {
    if (labels) {
      this.inner.inc(labels, value);
    } else {
      this.inner.inc(value);
    }
  }
}

export class PromHistogram implements Histogram {
  private readonly inner: promClient.Histogram;

  constructor(config: promClient.HistogramConfiguration<string>) {
    this.inner = new promClient.Histogram(config);
  }

  observe(value: number, labels?: LabelSet): void {
    if (labels) {
      this.inner.observe(labels, value);
    } else {
      this.inner.observe(value);
    }
  }

  async time<T>(fn: () => Promise<T>, labels?: LabelSet): Promise<T> {
    const end = labels
      ? this.inner.startTimer(labels)
      : this.inner.startTimer();
    try {
      return await fn();
    } finally {
      end();
    }
  }
}

export class PromGauge implements Gauge {
  private readonly inner: promClient.Gauge;

  constructor(config: promClient.GaugeConfiguration<string>) {
    this.inner = new promClient.Gauge(config);
  }

  set(value: number, labels?: LabelSet): void {
    if (labels) {
      this.inner.set(labels, value);
    } else {
      this.inner.set(value);
    }
  }

  inc(labels?: LabelSet, value?: number): void {
    if (labels) {
      this.inner.inc(labels, value);
    } else {
      this.inner.inc(value);
    }
  }

  dec(labels?: LabelSet, value?: number): void {
    if (labels) {
      this.inner.dec(labels, value);
    } else {
      this.inner.dec(value);
    }
  }
}

// ============================================================
// Factory — creates all PlatformMetrics backed by prom-client
// ============================================================

/**
 * Create a fully-wired PlatformMetrics using prom-client.
 *
 * Calling this also enables prom-client's default Node.js
 * process metrics (GC, event loop, memory, etc.).
 */
export function createPromMetrics(): PlatformMetrics {
  // Enable default Node.js process metrics
  promClient.collectDefaultMetrics();

  return {
    // Sessions
    sessionStartupLatency: new PromHistogram({
      name: 'udd_session_startup_latency_seconds',
      help: 'Time to fully start a user session (seconds)',
      buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    }),
    sandboxStartDuration: new PromHistogram({
      name: 'udd_sandbox_start_duration_seconds',
      help: 'Time to start a sandbox container (seconds)',
      buckets: [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
    }),

    // Previews
    previewBindLatency: new PromHistogram({
      name: 'udd_preview_bind_latency_seconds',
      help: 'Latency to bind a preview URL (seconds)',
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    }),
    previewErrorRate: new PromCounter({
      name: 'udd_preview_errors_total',
      help: 'Total preview errors',
    }),
    previewAuthorizationDenyRate: new PromCounter({
      name: 'udd_preview_authorization_denials_total',
      help: 'Total preview authorization denials',
    }),

    // WebSocket
    websocketConnections: new PromGauge({
      name: 'udd_websocket_connections',
      help: 'Current number of active WebSocket connections',
    }),

    // Queue
    queueDepth: new PromGauge({
      name: 'udd_queue_depth',
      help: 'Current queue depth',
    }),

    // Workers
    portAllocationExhaustion: new PromCounter({
      name: 'udd_port_allocation_exhaustion_total',
      help: 'Total port allocation exhaustion events',
    }),

    // AI Orchestration
    providerConfigCrudFailureRate: new PromCounter({
      name: 'udd_provider_config_crud_failures_total',
      help: 'Total provider config CRUD failures',
    }),
    secretRotationOutcome: new PromCounter({
      name: 'udd_secret_rotation_outcomes_total',
      help: 'Total secret rotation outcomes',
      labelNames: ['outcome'],
    }),
    pipelineRunStateTransitionLatency: new PromHistogram({
      name: 'udd_pipeline_run_state_transition_latency_seconds',
      help: 'Latency of pipeline run state transitions (seconds)',
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
    }),
    modelInvocationOutcome: new PromCounter({
      name: 'udd_model_invocation_outcomes_total',
      help: 'Total model invocation outcomes',
      labelNames: ['outcome'],
    }),
  };
}
