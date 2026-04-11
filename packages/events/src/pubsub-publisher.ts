import { PubSub, type Topic } from '@google-cloud/pubsub';
import type { PlatformEvent } from '@udd/contracts';
import type { EventPublisher } from './interfaces.js';

// ============================================================
// GCP Cloud Pub/Sub event publisher (replaces SqsEventPublisher)
//
// Each topic maps to a Pub/Sub topic named:
//   <PUBSUB_TOPIC_PREFIX>-<event-topic-with-dots-replaced-by-hyphens>
// e.g. session.created → udd-session-created
//
// Message ordering is enabled on every topic (equivalent to SQS FIFO
// MessageGroupId).  The orderingKey is set to the event topic so all
// events for the same topic arrive in publish order.
//
// Environment variables:
//   GCP_PROJECT_ID         — required
//   PUBSUB_TOPIC_PREFIX    — default: "udd"
// ============================================================

function topicName(eventTopic: string, prefix: string): string {
  return `${prefix}-${eventTopic.replace(/\./g, '-')}`;
}

export class PubSubEventPublisher implements EventPublisher {
  private readonly pubsub: PubSub;
  private readonly prefix: string;
  // Cache topic clients so we don't recreate them on every publish.
  private readonly topicCache = new Map<string, Topic>();

  constructor() {
    const projectId = process.env['GCP_PROJECT_ID'];
    if (!projectId) throw new Error('GCP_PROJECT_ID environment variable is required');
    this.pubsub = new PubSub({ projectId });
    this.prefix = process.env['PUBSUB_TOPIC_PREFIX'] ?? 'udd';
  }

  private getTopic(eventTopic: string): Topic {
    const name = topicName(eventTopic, this.prefix);
    let topic = this.topicCache.get(name);
    if (!topic) {
      // enableMessageOrdering must be set on the Topic client, not just
      // at publish time, so the underlying gRPC channel uses ordered streams.
      topic = this.pubsub.topic(name, { messageOrdering: true });
      this.topicCache.set(name, topic);
    }
    return topic;
  }

  async publish(event: PlatformEvent): Promise<void> {
    const topic = this.getTopic(event.topic);
    const data = Buffer.from(JSON.stringify(event), 'utf8');

    await topic.publishMessage({
      data,
      // orderingKey ensures messages with the same key are delivered in order.
      // Using the event topic mirrors the SQS FIFO MessageGroupId behaviour.
      orderingKey: event.topic,
      attributes: {
        correlationId: event.correlationId,
        topic: event.topic,
        timestamp: event.timestamp,
      },
    });
  }
}
