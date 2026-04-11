import { describe, it, expect, beforeEach } from 'vitest';
import { NoopEventPublisher } from './interfaces.js';
import type { PlatformEvent } from '@udd/contracts';

describe('NoopEventPublisher', () => {
  let publisher: NoopEventPublisher;

  beforeEach(() => {
    publisher = new NoopEventPublisher();
  });

  it('accumulates published events in memory', async () => {
    const event: PlatformEvent = {
      topic: 'session.created',
      payload: { sessionId: 'sess-1', projectId: 'proj-1', workspaceId: 'ws-1', userId: 'u-1' },
      correlationId: 'corr-1',
      timestamp: new Date().toISOString(),
    };

    await publisher.publish(event);
    expect(publisher.published).toHaveLength(1);
    expect(publisher.published[0]).toEqual(event);
  });

  it('accumulates multiple events in order', async () => {
    const events: PlatformEvent[] = [
      { topic: 'session.created', payload: {}, correlationId: 'c1', timestamp: '2026-01-01T00:00:00Z' } as PlatformEvent,
      { topic: 'session.state_changed', payload: {}, correlationId: 'c2', timestamp: '2026-01-01T00:00:01Z' } as PlatformEvent,
    ];

    for (const event of events) {
      await publisher.publish(event);
    }

    expect(publisher.published).toHaveLength(2);
    expect(publisher.published[0]?.correlationId).toBe('c1');
    expect(publisher.published[1]?.correlationId).toBe('c2');
  });

  it('reset() clears all published events', async () => {
    await publisher.publish({
      topic: 'session.created',
      payload: {},
      correlationId: 'c1',
      timestamp: new Date().toISOString(),
    } as PlatformEvent);

    publisher.reset();
    expect(publisher.published).toHaveLength(0);
  });

  it('does not throw on publish', async () => {
    await expect(
      publisher.publish({
        topic: 'preview.bound',
        payload: {},
        correlationId: 'c1',
        timestamp: new Date().toISOString(),
      } as PlatformEvent),
    ).resolves.toBeUndefined();
  });
});
