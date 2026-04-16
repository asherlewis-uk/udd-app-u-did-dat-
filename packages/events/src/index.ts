import { NoopEventPublisher } from './interfaces.js';
import type { EventPublisher } from './interfaces.js';
import { PubSubEventPublisher } from './pubsub-publisher.js';
import { SqsEventPublisher } from './sqs-publisher.js';
import { config } from '@udd/config';

export * from './topics.js';
export * from './interfaces.js';
export { PubSubEventPublisher } from './pubsub-publisher.js';
// SqsEventPublisher retained for reference during migration; remove after GCP cutover.
export { SqsEventPublisher } from './sqs-publisher.js';

/**
 * Creates the appropriate EventPublisher based on config.queue.provider().
 *   'pubsub' → PubSubEventPublisher (GCP Cloud Pub/Sub — hosted default)
 *   'sqs'    → SqsEventPublisher    (AWS SQS — legacy, retained for non-GCP deployments)
 *   other    → NoopEventPublisher   (local dev / test — set QUEUE_PROVIDER=noop)
 */
export function createEventPublisher(): EventPublisher {
  const provider = config.queue.provider();
  if (provider === 'pubsub') return new PubSubEventPublisher();
  if (provider === 'sqs') return new SqsEventPublisher();
  return new NoopEventPublisher();
}
