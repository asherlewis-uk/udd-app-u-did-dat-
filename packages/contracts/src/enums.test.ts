import { describe, it, expect } from 'vitest';
import { SESSION_TRANSITIONS, PIPELINE_RUN_TRANSITIONS } from './enums.js';
import type { SessionState, PipelineRunStatus } from './enums.js';

describe('SESSION_TRANSITIONS', () => {
  it('creating → starting is valid', () => {
    expect(SESSION_TRANSITIONS['creating']).toContain('starting');
  });

  it('running → idle is valid', () => {
    expect(SESSION_TRANSITIONS['running']).toContain('idle');
  });

  it('stopped → starting is invalid', () => {
    expect(SESSION_TRANSITIONS['stopped']).not.toContain('starting');
  });

  it('failed → any state is invalid', () => {
    expect(SESSION_TRANSITIONS['failed']).toHaveLength(0);
  });

  it('every session state has a transitions entry', () => {
    const states: SessionState[] = [
      'creating', 'starting', 'running', 'idle', 'stopping', 'stopped', 'failed',
    ];
    for (const state of states) {
      expect(SESSION_TRANSITIONS).toHaveProperty(state);
    }
  });
});

describe('PIPELINE_RUN_TRANSITIONS', () => {
  it('queued → preparing is valid', () => {
    expect(PIPELINE_RUN_TRANSITIONS['queued']).toContain('preparing');
  });

  it('running → succeeded is valid', () => {
    expect(PIPELINE_RUN_TRANSITIONS['running']).toContain('succeeded');
  });

  it('running → failed is valid', () => {
    expect(PIPELINE_RUN_TRANSITIONS['running']).toContain('failed');
  });

  it('succeeded is a terminal state', () => {
    expect(PIPELINE_RUN_TRANSITIONS['succeeded']).toHaveLength(0);
  });

  it('failed is a terminal state', () => {
    expect(PIPELINE_RUN_TRANSITIONS['failed']).toHaveLength(0);
  });

  it('every pipeline run status has a transitions entry', () => {
    const statuses: PipelineRunStatus[] = [
      'queued', 'preparing', 'running', 'succeeded', 'failed', 'canceled',
    ];
    for (const status of statuses) {
      expect(PIPELINE_RUN_TRANSITIONS).toHaveProperty(status);
    }
  });
});
