'use client';

import { cn } from '@/lib/cn';
import { getSessionStateDisplay } from '@/lib/session-state';
import type { SessionState } from '@udd/contracts';

interface SessionStatusBadgeProps {
  state: SessionState;
  size?: 'sm' | 'md';
}

export function SessionStatusBadge({ state, size = 'md' }: SessionStatusBadgeProps) {
  const display = getSessionStateDisplay(state);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        display.bgClass,
        display.textClass,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs',
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', display.dotClass)} />
      {display.label}
    </span>
  );
}
