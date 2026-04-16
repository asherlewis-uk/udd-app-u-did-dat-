import { builtinStacks } from './stacks.js';
import type { StackDefinition } from './types.js';

const stackById = new Map<string, StackDefinition>(
  builtinStacks.map((s) => [s.id, s]),
);

/** Return a stack definition by id, or undefined if not found. */
export function getStack(id: string): StackDefinition | undefined {
  return stackById.get(id);
}

/** Return all registered stack definitions. */
export function getAllStacks(): StackDefinition[] {
  return [...builtinStacks];
}

/**
 * Given a list of file paths / names, return the best-matching stack.
 *
 * Detection strategy:
 *  1. For each stack (ordered most-specific first) check if any of its
 *     `entryPatterns` appear in the file list (basename match).
 *  2. If no entry-pattern matches, fall back to extension frequency:
 *     the stack whose extensions cover the most files wins.
 *  3. Returns `undefined` when nothing matches.
 */
export function detectStack(files: string[]): StackDefinition | undefined {
  if (files.length === 0) return undefined;

  const basenames = new Set(files.map(basename));

  // Phase 1 — entry-pattern matching (priority = array order in builtinStacks)
  for (const stack of builtinStacks) {
    for (const pattern of stack.entryPatterns) {
      // Support simple wildcard patterns like '*.csproj'
      if (pattern.includes('*')) {
        const suffix = pattern.slice(pattern.indexOf('*') + 1);
        for (const b of basenames) {
          if (b.endsWith(suffix)) return stack;
        }
      } else if (basenames.has(pattern)) {
        return stack;
      }
    }
  }

  // Phase 2 — extension frequency fallback
  const extCounts = new Map<string, number>();
  for (const file of files) {
    const ext = extname(file);
    if (ext) {
      extCounts.set(ext, (extCounts.get(ext) ?? 0) + 1);
    }
  }

  if (extCounts.size === 0) return undefined;

  let bestStack: StackDefinition | undefined;
  let bestCount = 0;

  for (const stack of builtinStacks) {
    let count = 0;
    for (const ext of stack.extensions) {
      count += extCounts.get(ext) ?? 0;
    }
    if (count > bestCount) {
      bestCount = count;
      bestStack = stack;
    }
  }

  return bestStack;
}

// ── Helpers ──────────────────────────────────────────────────

/** Return the basename of a path (last segment after / or \). */
function basename(filePath: string): string {
  const i = Math.max(filePath.lastIndexOf('/'), filePath.lastIndexOf('\\'));
  return i === -1 ? filePath : filePath.slice(i + 1);
}

/** Return the extension of a file name (e.g. '.ts'). Empty string if none. */
function extname(filePath: string): string {
  const base = basename(filePath);
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? '' : base.slice(dot);
}
