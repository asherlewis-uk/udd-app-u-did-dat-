import type { PlatformEvent, Topic } from '@udd/contracts';

// ============================================================
// Publisher interface
// ============================================================

export interface PublishOptions {
  /** Optional deduplication key */
  deduplicationKey?: string;
  /** Optional message group key */
  groupKey?: string;
}

export interface EventPublisher {
  publish(event: PlatformEvent, options?: PublishOptions): Promise<void>;
}

// ============================================================
// Consumer interface
// ============================================================

export interface ConsumeOptions {
  /** Maximum number of messages to receive per poll */
  maxMessages?: number;
  /** Visibility timeout in seconds */
  visibilityTimeoutSeconds?: number;
  /** Whether to auto-acknowledge on successful handler completion */
  autoAck?: boolean;
}

export type MessageHandler<T extends PlatformEvent = PlatformEvent> = (
  message: T,
  ack: () => Promise<void>,
  nack: (err?: Error) => Promise<void>,
) => Promise<void>;

export interface EventConsumer {
  subscribe(topic: Topic, handler: MessageHandler, options?: ConsumeOptions): void;
  start(): Promise<void>;
  stop(): Promise<void>;
}

// ============================================================
// Dead Letter Queue interface
// ============================================================

export interface DLQEntry {
  messageId: string;
  topic: Topic;
  payload: unknown;
  error: string;
  failedAt: string;
  retryCount: number;
}

export interface DeadLetterQueue {
  enqueue(entry: DLQEntry): Promise<void>;
  list(options?: { topic?: Topic; limit?: number }): Promise<DLQEntry[]>;
  reprocess(messageId: string): Promise<void>;
}

// ============================================================
// Null/in-process publisher for testing
// ============================================================

export class NoopEventPublisher implements EventPublisher {
  readonly published: PlatformEvent[] = [];

  async publish(event: PlatformEvent): Promise<void> {
    this.published.push(event);
  }

  reset(): void {
    this.published.length = 0;
  }
}
