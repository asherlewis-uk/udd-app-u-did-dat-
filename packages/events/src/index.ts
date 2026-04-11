import { NoopEventPublisher } from './interfaces.js';
import type { EventPublisher } from './interfaces.js';
import { PubSubEventPublisher } from './pubsub-publisher.js';
import { SqsEventPublisher } from './sqs-publisher.js';

export * from './topics.js';
export * from './interfaces.js';
export { PubSubEventPublisher } from './pubsub-publisher.js';
// SqsEventPublisher retained for reference during migration; remove after GCP cutover.
export { SqsEventPublisher } from './sqs-publisher.js';

/**
 * Creates the appropriate EventPublisher based on the QUEUE_PROVIDER environment variable.
 *   'pubsub' → PubSubEventPublisher (GCP Cloud Pub/Sub — production default)
 *   'sqs'    → SqsEventPublisher    (AWS SQS — legacy, remove after GCP cutover)
 *   <unset>  → NoopEventPublisher   (local dev / test)
 */
export function createEventPublisher(): EventPublisher {
  const provider = process.env['QUEUE_PROVIDER'];
  if (provider === 'pubsub') return new PubSubEventPublisher();
  if (provider === 'sqs') return new SqsEventPublisher();
  return new NoopEventPublisher();
}
