import { NoopEventPublisher } from './interfaces.js';
import type { EventPublisher } from './interfaces.js';
import { PubSubEventPublisher } from './pubsub-publisher.js';
import { config } from '@udd/config';

export * from './topics.js';
export * from './interfaces.js';
export { PubSubEventPublisher } from './pubsub-publisher.js';

/**
 * Creates the appropriate EventPublisher based on config.queue.provider().
 *   'pubsub' → PubSubEventPublisher (GCP Cloud Pub/Sub — hosted default)
 *   other    → NoopEventPublisher   (local dev / test — set QUEUE_PROVIDER=noop)
 */
export function createEventPublisher(): EventPublisher {
  const provider = config.queue.provider();
  if (provider === 'pubsub') return new PubSubEventPublisher();
  return new NoopEventPublisher();
}
