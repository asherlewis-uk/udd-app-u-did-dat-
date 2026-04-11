'use client';

import * as React from 'react';
import { GitBranch } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { DagNode, DagEdge } from '@udd/contracts';

interface PipelineGraphProps {
  nodes: DagNode[];
  edges: DagEdge[];
}

type NodeTypeColor = 'llm' | 'tool' | 'input' | 'output' | 'default';

const nodeColorClasses: Record<NodeTypeColor, { bg: string; border: string; text: string; dot: string }> = {
  llm: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-300',
    dot: 'bg-indigo-400',
  },
  tool: {
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-300',
    dot: 'bg-emerald-400',
  },
  input: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-300',
    dot: 'bg-blue-400',
  },
  output: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-300',
    dot: 'bg-purple-400',
  },
  default: {
    bg: 'bg-zinc-800/60',
    border: 'border-zinc-700/60',
    text: 'text-zinc-300',
    dot: 'bg-zinc-400',
  },
};

function getNodeColors(type: string) {
  const key = ['llm', 'tool', 'input', 'output'].includes(type)
    ? (type as NodeTypeColor)
    : 'default';
  return nodeColorClasses[key];
}

/**
 * Kahn's topological sort — returns node IDs grouped into levels.
 * Each level can be rendered as a column.
 */
function topoLevels(nodes: DagNode[], edges: DagEdge[]): string[][] {
  const nodeIds = new Set(nodes.map((n) => n.id));
  const inDegree = new Map<string, number>();
  const adjList = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adjList.set(id, []);
  }

  for (const edge of edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) continue;
    adjList.get(edge.from)!.push(edge.to);
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  const levels: string[][] = [];
  let currentLevel = [...nodeIds].filter((id) => (inDegree.get(id) ?? 0) === 0);

  while (currentLevel.length > 0) {
    levels.push(currentLevel);
    const nextLevel: string[] = [];
    for (const id of currentLevel) {
      for (const neighbor of adjList.get(id) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 0) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) nextLevel.push(neighbor);
      }
    }
    currentLevel = nextLevel;
  }

  // Any remaining nodes (cycles) go in a final level
  const placed = new Set(levels.flat());
  const remaining = [...nodeIds].filter((id) => !placed.has(id));
  if (remaining.length > 0) levels.push(remaining);

  return levels;
}

interface NodeBoxProps {
  node: DagNode;
}

function NodeBox({ node }: NodeBoxProps) {
  const colors = getNodeColors(node.type);
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-lg border px-3 py-2.5 min-w-[100px] max-w-[160px]',
        colors.bg,
        colors.border,
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', colors.dot)} />
        <span className={cn('truncate text-[10px] font-medium uppercase tracking-wider', colors.text)}>
          {node.type}
        </span>
      </div>
      <p className="truncate text-xs font-medium text-[#fafafa]">
        {node.label ?? node.id}
      </p>
    </div>
  );
}

/** Simple horizontal arrow rendered as pure CSS */
function Arrow() {
  return (
    <div className="flex shrink-0 items-center self-center">
      <div className="h-px w-8 bg-white/[0.15]" />
      <div
        className="border-y-4 border-l-4 border-y-transparent border-l-white/[0.25]"
        style={{ borderTopWidth: 4, borderBottomWidth: 4, borderLeftWidth: 6 }}
      />
    </div>
  );
}

export function PipelineGraph({ nodes, edges }: PipelineGraphProps) {
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/[0.1] p-10 text-center">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.04] text-[#71717a]">
          <GitBranch className="h-5 w-5" />
        </div>
        <p className="text-sm text-[#71717a]">No nodes in this pipeline</p>
      </div>
    );
  }

  const levels = topoLevels(nodes, edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.07] bg-[#111113] p-6">
      <div className="flex items-start gap-0">
        {levels.map((level, levelIdx) => (
          <React.Fragment key={levelIdx}>
            {/* Column of nodes at this level */}
            <div className="flex flex-col gap-3">
              {level.map((nodeId) => {
                const node = nodeMap.get(nodeId);
                if (!node) return null;
                return <NodeBox key={nodeId} node={node} />;
              })}
            </div>

            {/* Arrow between columns */}
            {levelIdx < levels.length - 1 && <Arrow />}
          </React.Fragment>
        ))}
      </div>

      {/* Edge count label */}
      <p className="mt-4 text-[10px] text-[#71717a]">
        {nodes.length} node{nodes.length !== 1 ? 's' : ''} &middot;{' '}
        {edges.length} edge{edges.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
