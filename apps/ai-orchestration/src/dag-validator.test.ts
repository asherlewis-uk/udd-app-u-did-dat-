import { describe, it, expect, vi } from 'vitest';
import { validateDag } from './dag-validator.js';
import type { AgentRoleRepository } from '@udd/database';
import type { PipelineDefinitionJson } from '@udd/contracts';
import { makeAgentRole } from '@udd/testing';

const WORKSPACE_ID = 'ws-test-123';

function makeRoleRepo(roles: ReturnType<typeof makeAgentRole>[]): AgentRoleRepository {
  return {
    findById: vi.fn(async (id: string) => roles.find((r) => r.id === id) ?? null),
    findByWorkspaceId: vi.fn(async () => ({ items: roles, nextCursor: null, hasMore: false })),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  } as unknown as AgentRoleRepository;
}

describe('validateDag', () => {
  it('rejects empty node list', async () => {
    const def: PipelineDefinitionJson = { nodes: [], edges: [] };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([]));
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toMatch(/at least one node/i);
  });

  it('rejects edge that references unknown source node', async () => {
    const role = makeAgentRole({ workspaceId: WORKSPACE_ID, isActive: true });
    const def: PipelineDefinitionJson = {
      nodes: [{ id: 'node-1', agentRoleId: role.id, kind: 'role_step' }],
      edges: [{ from: 'unknown-node', to: 'node-1' }],
    };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([role]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('unknown source node'))).toBe(true);
  });

  it('rejects edge that references unknown target node', async () => {
    const role = makeAgentRole({ workspaceId: WORKSPACE_ID, isActive: true });
    const def: PipelineDefinitionJson = {
      nodes: [{ id: 'node-1', agentRoleId: role.id, kind: 'role_step' }],
      edges: [{ from: 'node-1', to: 'missing' }],
    };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([role]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('unknown target node'))).toBe(true);
  });

  it('rejects agent role not found', async () => {
    const def: PipelineDefinitionJson = {
      nodes: [{ id: 'node-1', agentRoleId: 'nonexistent-role', kind: 'role_step' }],
      edges: [],
    };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('not found'))).toBe(true);
  });

  it('rejects agent role from different workspace', async () => {
    const role = makeAgentRole({ workspaceId: 'different-workspace', isActive: true });
    const def: PipelineDefinitionJson = {
      nodes: [{ id: 'node-1', agentRoleId: role.id, kind: 'role_step' }],
      edges: [],
    };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([role]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('does not belong'))).toBe(true);
  });

  it('rejects inactive agent role', async () => {
    const role = makeAgentRole({ workspaceId: WORKSPACE_ID, isActive: false });
    const def: PipelineDefinitionJson = {
      nodes: [{ id: 'node-1', agentRoleId: role.id, kind: 'role_step' }],
      edges: [],
    };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([role]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('inactive'))).toBe(true);
  });

  it('rejects a graph with a cycle', async () => {
    const role = makeAgentRole({ workspaceId: WORKSPACE_ID, isActive: true });
    const def: PipelineDefinitionJson = {
      nodes: [
        { id: 'a', agentRoleId: role.id, kind: 'role_step' },
        { id: 'b', agentRoleId: role.id, kind: 'role_step' },
        { id: 'c', agentRoleId: role.id, kind: 'role_step' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'b', to: 'c' },
        { from: 'c', to: 'a' }, // cycle
      ],
    };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([role]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.toLowerCase().includes('cycle'))).toBe(true);
  });

  it('accepts a valid linear pipeline', async () => {
    const role1 = makeAgentRole({ id: 'role-1', workspaceId: WORKSPACE_ID, isActive: true });
    const role2 = makeAgentRole({ id: 'role-2', workspaceId: WORKSPACE_ID, isActive: true });
    const def: PipelineDefinitionJson = {
      nodes: [
        { id: 'a', agentRoleId: role1.id, kind: 'role_step' },
        { id: 'b', agentRoleId: role2.id, kind: 'role_step' },
      ],
      edges: [{ from: 'a', to: 'b' }],
    };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([role1, role2]));
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('accepts a single-node pipeline with no edges', async () => {
    const role = makeAgentRole({ workspaceId: WORKSPACE_ID, isActive: true });
    const def: PipelineDefinitionJson = {
      nodes: [{ id: 'node-1', agentRoleId: role.id, kind: 'role_step' }],
      edges: [],
    };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([role]));
    expect(result.valid).toBe(true);
  });

  it('accepts a diamond-shaped (parallel merge) DAG', async () => {
    const role = makeAgentRole({ workspaceId: WORKSPACE_ID, isActive: true });
    const def: PipelineDefinitionJson = {
      nodes: [
        { id: 'a', agentRoleId: role.id, kind: 'role_step' },
        { id: 'b', agentRoleId: role.id, kind: 'role_step' },
        { id: 'c', agentRoleId: role.id, kind: 'role_step' },
        { id: 'd', agentRoleId: role.id, kind: 'role_step' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c' },
        { from: 'b', to: 'd' },
        { from: 'c', to: 'd' },
      ],
    };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([role]));
    expect(result.valid).toBe(true);
  });

  // ─── Security-hardening tests (L-1 through L-4) ───────────────────────────

  it('rejects duplicate node IDs (L-1)', async () => {
    const role = makeAgentRole({ workspaceId: WORKSPACE_ID, isActive: true });
    const def: PipelineDefinitionJson = {
      nodes: [
        { id: 'node-1', agentRoleId: role.id, kind: 'role_step' },
        { id: 'node-1', agentRoleId: role.id, kind: 'role_step' }, // duplicate
      ],
      edges: [],
    };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([role]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /duplicate node ids/i.test(e))).toBe(true);
  });

  it('rejects a self-referencing edge (L-2)', async () => {
    const role = makeAgentRole({ workspaceId: WORKSPACE_ID, isActive: true });
    const def: PipelineDefinitionJson = {
      nodes: [{ id: 'node-1', agentRoleId: role.id, kind: 'role_step' }],
      edges: [{ from: 'node-1', to: 'node-1' }], // self-loop
    };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([role]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /self-referencing/i.test(e))).toBe(true);
  });

  it('rejects a pipeline that exceeds the maximum node count (L-3)', async () => {
    const role = makeAgentRole({ workspaceId: WORKSPACE_ID, isActive: true });
    const nodes = Array.from({ length: 501 }, (_, i) => ({
      id: `node-${i}`,
      agentRoleId: role.id,
      kind: 'role_step' as const,
    }));
    const def: PipelineDefinitionJson = { nodes, edges: [] };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([role]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /maximum/i.test(e))).toBe(true);
  });

  it('rejects duplicate edges (L-4)', async () => {
    const role = makeAgentRole({ workspaceId: WORKSPACE_ID, isActive: true });
    const def: PipelineDefinitionJson = {
      nodes: [
        { id: 'a', agentRoleId: role.id, kind: 'role_step' },
        { id: 'b', agentRoleId: role.id, kind: 'role_step' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'b' }, // duplicate
      ],
    };
    const result = await validateDag(def, WORKSPACE_ID, makeRoleRepo([role]));
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => /duplicate edge/i.test(e) && e.includes('a') && e.includes('b'))).toBe(true);
  });
});
