import {
  SQSClient,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';
import { config } from '@udd/config';
import type { EventPublisher, PublishOptions } from './interfaces.js';
import type { PlatformEvent } from '@udd/contracts';

// ============================================================
// SQS FIFO EventPublisher
// Publishes platform events to a SQS FIFO queue.
// Uses topic as the MessageGroupId for ordering guarantees.
// ============================================================

function getSQSClient(): SQSClient {
  return new SQSClient({
    region: config.queue.awsRegion(),
  });
}

export class SqsEventPublisher implements EventPublisher {
  private readonly queueUrl: string;
  private readonly client: SQSClient;

  constructor(queueUrl?: string) {
    this.queueUrl = queueUrl ?? config.queue.queueUrlPrefix();
    if (!this.queueUrl) {
      throw new Error(
        'SQS_EVENTS_QUEUE_URL environment variable is required for SqsEventPublisher',
      );
    }
    this.client = getSQSClient();
  }

  async publish(event: PlatformEvent, options?: PublishOptions): Promise<void> {
    const messageBody = JSON.stringify(event);

    // FIFO queues require MessageGroupId and MessageDeduplicationId
    const groupKey = options?.groupKey ?? event.topic;
    const dedupKey =
      options?.deduplicationKey ??
      // Default dedup key: topic + correlationId (idempotent per correlation)
      `${event.topic}:${event.correlationId}:${Date.now()}`;

    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: messageBody,
        MessageGroupId: groupKey,
        MessageDeduplicationId: dedupKey,
        MessageAttributes: {
          topic: {
            DataType: 'String',
            StringValue: event.topic,
          },
          correlationId: {
            DataType: 'String',
            StringValue: event.correlationId,
          },
        },
      }),
    );
  }
}
