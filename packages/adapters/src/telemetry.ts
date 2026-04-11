import type { TelemetrySink, TelemetryEvent } from './interfaces.js';

export class NoopTelemetrySink implements TelemetrySink {
  async emit(_event: TelemetryEvent): Promise<void> {}
  async flush(): Promise<void> {}
}

export class ConsoleTelemetrySink implements TelemetrySink {
  async emit(event: TelemetryEvent): Promise<void> {
    process.stdout.write(JSON.stringify({ telemetry: event }) + '\n');
  }
  async flush(): Promise<void> {}
}
