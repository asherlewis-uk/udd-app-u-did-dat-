// Re-export topic constants from contracts as the canonical definition
export { TOPICS } from '@udd/contracts';
export type { Topic, PlatformEvent } from '@udd/contracts';

// ============================================================
// Topic ownership table (documentation + runtime reference)
// ============================================================

export const TOPIC_OWNERSHIP = {
  'session.created': {
    publisher: 'orchestrator',
    consumers: ['usage-meter', 'audit'],
  },
  'session.resumed': {
    publisher: 'orchestrator',
    consumers: ['usage-meter'],
  },
  'session.idle_detected': {
    publisher: 'session-reaper',
    consumers: ['orchestrator'],
  },
  'session.terminated': {
    publisher: 'orchestrator',
    consumers: ['worker-manager', 'usage-meter', 'audit'],
  },
  'session.state_changed': {
    publisher: 'orchestrator',
    consumers: ['audit'],
  },
  'preview.route.bound': {
    publisher: 'orchestrator',
    consumers: ['gateway', 'audit'],
  },
  'preview.route.revoked': {
    publisher: 'orchestrator|session-reaper',
    consumers: ['gateway', 'audit'],
  },
  'sandbox.capacity.low': {
    publisher: 'worker-manager',
    consumers: ['orchestrator'],
  },
  'worker.registered': {
    publisher: 'host-agent',
    consumers: ['worker-manager'],
  },
  'artifact.created': {
    publisher: 'orchestrator',
    consumers: ['usage-meter'],
  },
  'usage.meter.recorded': {
    publisher: 'usage-meter',
    consumers: ['billing'],
  },
  'provider_config.created': {
    publisher: 'ai-orchestration',
    consumers: ['audit'],
  },
  'provider_config.updated': {
    publisher: 'ai-orchestration',
    consumers: ['audit'],
  },
  'provider_config.secret_rotated': {
    publisher: 'ai-orchestration',
    consumers: ['audit'],
  },
  'agent_role.created': {
    publisher: 'ai-orchestration',
    consumers: ['audit'],
  },
  'pipeline.created': {
    publisher: 'ai-orchestration',
    consumers: ['audit'],
  },
  'pipeline_run.created': {
    publisher: 'ai-orchestration',
    consumers: ['audit', 'usage-meter'],
  },
  'pipeline_run.status_changed': {
    publisher: 'ai-orchestration',
    consumers: ['audit'],
  },
} as const;
