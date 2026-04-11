import type { PipelineDefinitionJson } from '@udd/contracts';
import type { AgentRoleRepository } from '@udd/database';

export interface DagValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a pipeline DAG definition:
 *   1. At least one node
 *   2. Max nodes (500) and max edges (5000)
 *   3. No duplicate node IDs
 *   4. No self-loops, no duplicate edges, all edge source/target IDs reference valid node IDs
 *   5. All node agentRoleIds exist in the workspace and are active
 *   6. No cycles (topological sort via Kahn's algorithm)
 */
export async function validateDag(
  definition: PipelineDefinitionJson,
  workspaceId: string,
  agentRoles: AgentRoleRepository,
): Promise<DagValidationResult> {
  const errors: string[] = [];
  const { nodes, edges } = definition;

  // Rule 1: at least one node
  if (!nodes || nodes.length === 0) {
    errors.push('Pipeline must have at least one node');
    return { valid: false, errors };
  }

  // Rule 2: maximum size limits (configurable via env; lower-bound guard prevents 0)
  const MAX_NODES = Math.max(1, parseInt(process.env['PIPELINE_MAX_NODES'] ?? '500', 10) || 500);
  const MAX_EDGES = Math.max(1, parseInt(process.env['PIPELINE_MAX_EDGES'] ?? '5000', 10) || 5000);

  if (nodes.length > MAX_NODES) {
    errors.push(`Pipeline exceeds the maximum of ${MAX_NODES} nodes (got ${nodes.length})`);
    return { valid: false, errors };
  }

  if ((edges ?? []).length > MAX_EDGES) {
    errors.push(`Pipeline exceeds the maximum of ${MAX_EDGES} edges (got ${(edges ?? []).length})`);
    return { valid: false, errors };
  }

  // Build node ID set for fast lookup
  const nodeIds = new Set(nodes.map((n) => n.id));

  // Rule 3: detect duplicate node IDs
  if (nodeIds.size !== nodes.length) {
    errors.push('Duplicate node IDs detected in pipeline definition');
    return { valid: false, errors };
  }

  // Rule 4: validate edges — self-loops, duplicate edges, unknown node references
  const seenEdges = new Set<string>();
  for (const edge of edges ?? []) {
    // Self-loop check
    if (edge.from === edge.to) {
      errors.push(`Edge is self-referencing: node '${edge.from}' has an edge to itself`);
      continue;
    }

    // Duplicate edge check
    const edgeKey = `${edge.from}→${edge.to}`;
    if (seenEdges.has(edgeKey)) {
      errors.push(`Duplicate edge detected from '${edge.from}' to '${edge.to}'`);
      continue;
    }
    seenEdges.add(edgeKey);

    // Unknown node reference checks
    if (!nodeIds.has(edge.from)) {
      errors.push(`Edge references unknown source node ID '${edge.from}'`);
    }
    if (!nodeIds.has(edge.to)) {
      errors.push(`Edge references unknown target node ID '${edge.to}'`);
    }
  }

  // Rule 5: all agentRoleIds must exist and be active in this workspace
  const uniqueRoleIds = [...new Set(nodes.map((n) => n.agentRoleId))];
  for (const roleId of uniqueRoleIds) {
    const role = await agentRoles.findById(roleId);
    if (!role) {
      errors.push(`Agent role '${roleId}' not found`);
    } else if (role.workspaceId !== workspaceId) {
      errors.push(`Agent role '${roleId}' does not belong to this workspace`);
    } else if (!role.isActive) {
      errors.push(`Agent role '${roleId}' is inactive`);
    }
  }

  // If there are structural errors, skip cycle check
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  // Rule 6: no cycles — Kahn's algorithm (BFS topological sort)
  const inDegree = new Map<string, number>();
  for (const id of nodeIds) inDegree.set(id, 0);

  for (const edge of edges ?? []) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const adjacency = new Map<string, string[]>();
  for (const id of nodeIds) adjacency.set(id, []);
  for (const edge of edges ?? []) {
    adjacency.get(edge.from)!.push(edge.to);
  }

  // Queue nodes with in-degree 0
  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  let visited = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    visited++;
    for (const neighbor of adjacency.get(current) ?? []) {
      const newDeg = (inDegree.get(neighbor) ?? 0) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  if (visited !== nodes.length) {
    errors.push('Pipeline definition contains a cycle');
  }

  return { valid: errors.length === 0, errors };
}
