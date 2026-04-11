import type { SessionState, PipelineRunStatus } from '@udd/contracts';

export interface StateDisplay {
  label: string;
  color: string;        // CSS custom property value
  bgClass: string;      // Tailwind bg class
  textClass: string;    // Tailwind text class
  dotClass: string;     // Tailwind bg class for the dot indicator
  isTerminal: boolean;
  isActive: boolean;
}

const SESSION_STATE_MAP: Record<SessionState, StateDisplay> = {
  creating: {
    label: 'Creating',
    color: 'var(--color-state-creating)',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    dotClass: 'bg-amber-400',
    isTerminal: false,
    isActive: false,
  },
  starting: {
    label: 'Starting',
    color: 'var(--color-state-starting)',
    bgClass: 'bg-amber-500/10',
    textClass: 'text-amber-400',
    dotClass: 'bg-amber-400 animate-pulse',
    isTerminal: false,
    isActive: false,
  },
  running: {
    label: 'Running',
    color: 'var(--color-state-running)',
    bgClass: 'bg-emerald-500/10',
    textClass: 'text-emerald-400',
    dotClass: 'bg-emerald-400',
    isTerminal: false,
    isActive: true,
  },
  idle: {
    label: 'Idle',
    color: 'var(--color-state-idle)',
    bgClass: 'bg-blue-500/10',
    textClass: 'text-blue-400',
    dotClass: 'bg-blue-400',
    isTerminal: false,
    isActive: true,
  },
  stopping: {
    label: 'Stopping',
    color: 'var(--color-state-stopping)',
    bgClass: 'bg-orange-500/10',
    textClass: 'text-orange-400',
    dotClass: 'bg-orange-400 animate-pulse',
    isTerminal: false,
    isActive: false,
  },
  stopped: {
    label: 'Stopped',
    color: 'var(--color-state-stopped)',
    bgClass: 'bg-zinc-700/40',
    textClass: 'text-zinc-400',
    dotClass: 'bg-zinc-500',
    isTerminal: true,
    isActive: false,
  },
  failed: {
    label: 'Failed',
    color: 'var(--color-state-failed)',
    bgClass: 'bg-red-500/10',
    textClass: 'text-red-400',
    dotClass: 'bg-red-400',
    isTerminal: true,
    isActive: false,
  },
};

export function getSessionStateDisplay(state: SessionState): StateDisplay {
  return SESSION_STATE_MAP[state];
}

export interface RunDisplay {
  label: string;
  bgClass: string;
  textClass: string;
  isTerminal: boolean;
}

const RUN_STATUS_MAP: Record<PipelineRunStatus, RunDisplay> = {
  queued: { label: 'Queued', bgClass: 'bg-zinc-700/40', textClass: 'text-zinc-400', isTerminal: false },
  preparing: { label: 'Preparing', bgClass: 'bg-amber-500/10', textClass: 'text-amber-400', isTerminal: false },
  running: { label: 'Running', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400', isTerminal: false },
  succeeded: { label: 'Succeeded', bgClass: 'bg-emerald-500/10', textClass: 'text-emerald-400', isTerminal: true },
  failed: { label: 'Failed', bgClass: 'bg-red-500/10', textClass: 'text-red-400', isTerminal: true },
  canceled: { label: 'Canceled', bgClass: 'bg-zinc-700/40', textClass: 'text-zinc-500', isTerminal: true },
};

export function getRunStatusDisplay(status: PipelineRunStatus): RunDisplay {
  return RUN_STATUS_MAP[status];
}
