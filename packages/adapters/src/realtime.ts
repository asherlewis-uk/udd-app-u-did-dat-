import Pusher from 'pusher';
import { config } from '@udd/config';
import type { RealtimeProvider } from './interfaces.js';

// ============================================================
// Pusher implementation
// ============================================================

export class PusherRealtimeProvider implements RealtimeProvider {
  private readonly client: Pusher;

  constructor() {
    this.client = new Pusher({
      appId: config.pusher.appId(),
      key: config.pusher.key(),
      secret: config.pusher.secret(),
      cluster: config.pusher.cluster(),
      useTLS: true,
    });
  }

  async trigger(channel: string, event: string, data: unknown): Promise<void> {
    await this.client.trigger(channel, event, data);
  }
}

// ============================================================
// In-memory implementation (for tests)
// ============================================================

export interface RecordedEvent {
  channel: string;
  event: string;
  data: unknown;
}

export class InMemoryRealtimeProvider implements RealtimeProvider {
  public readonly events: RecordedEvent[] = [];

  async trigger(channel: string, event: string, data: unknown): Promise<void> {
    this.events.push({ channel, event, data });
  }

  /** Reset recorded events between tests. */
  clear(): void {
    this.events.length = 0;
  }
}
