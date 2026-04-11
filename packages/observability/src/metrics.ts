// ============================================================
// Lightweight metrics interface — production implementations
// should wire to Prometheus or OTLP exporters.
// This module provides a typed in-process stub.
// ============================================================

export interface LabelSet {
  [label: string]: string;
}

export interface Counter {
  inc(labels?: LabelSet, value?: number): void;
}

export interface Histogram {
  observe(value: number, labels?: LabelSet): void;
  /** Helper to time a function */
  time<T>(fn: () => Promise<T>, labels?: LabelSet): Promise<T>;
}

export interface Gauge {
  set(value: number, labels?: LabelSet): void;
  inc(labels?: LabelSet, value?: number): void;
  dec(labels?: LabelSet, value?: number): void;
}

// ============================================================
// In-process stub (for dev / testing — replace with prom-client)
// ============================================================

export class NoopCounter implements Counter {
  inc(_labels?: LabelSet, _value?: number): void {}
}

export class NoopHistogram implements Histogram {
  observe(_value: number, _labels?: LabelSet): void {}
  async time<T>(fn: () => Promise<T>, _labels?: LabelSet): Promise<T> {
    return fn();
  }
}

export class NoopGauge implements Gauge {
  set(_value: number, _labels?: LabelSet): void {}
  inc(_labels?: LabelSet, _value?: number): void {}
  dec(_labels?: LabelSet, _value?: number): void {}
}

// ============================================================
// Platform metrics — all named metrics defined here
// ============================================================

export interface PlatformMetrics {
  // Sessions
  sessionStartupLatency: Histogram;
  sandboxStartDuration: Histogram;

  // Previews
  previewBindLatency: Histogram;
  previewErrorRate: Counter;
  previewAuthorizationDenyRate: Counter;

  // WebSocket
  websocketConnections: Gauge;

  // Queue
  queueDepth: Gauge;

  // Workers
  portAllocationExhaustion: Counter;

  // AI Orchestration
  providerConfigCrudFailureRate: Counter;
  secretRotationOutcome: Counter;
  pipelineRunStateTransitionLatency: Histogram;
  modelInvocationOutcome: Counter;
}

function noopMetrics(): PlatformMetrics {
  return {
    sessionStartupLatency: new NoopHistogram(),
    sandboxStartDuration: new NoopHistogram(),
    previewBindLatency: new NoopHistogram(),
    previewErrorRate: new NoopCounter(),
    previewAuthorizationDenyRate: new NoopCounter(),
    websocketConnections: new NoopGauge(),
    queueDepth: new NoopGauge(),
    portAllocationExhaustion: new NoopCounter(),
    providerConfigCrudFailureRate: new NoopCounter(),
    secretRotationOutcome: new NoopCounter(),
    pipelineRunStateTransitionLatency: new NoopHistogram(),
    modelInvocationOutcome: new NoopCounter(),
  };
}

// Singleton — replace in production startup with a real implementation
let _metrics: PlatformMetrics = noopMetrics();

export function setMetrics(m: PlatformMetrics): void {
  _metrics = m;
}

export function getMetrics(): PlatformMetrics {
  return _metrics;
}
