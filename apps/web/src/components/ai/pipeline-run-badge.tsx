'use client';

import { cn } from '@/lib/cn';
import { getRunStatusDisplay } from '@/lib/session-state';
import type { PipelineRunStatus } from '@udd/contracts';

interface PipelineRunBadgeProps {
  status: PipelineRunStatus;
  size?: 'sm' | 'md';
}

const dotSizeClasses: Record<NonNullable<PipelineRunBadgeProps['size']>, string> = {
  sm: 'h-1.5 w-1.5',
  md: 'h-2 w-2',
};

const paddingClasses: Record<NonNullable<PipelineRunBadgeProps['size']>, string> = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

const animatedStatuses: PipelineRunStatus[] = ['queued', 'preparing', 'running'];

export function PipelineRunBadge({ status, size = 'md' }: PipelineRunBadgeProps) {
  const display = getRunStatusDisplay(status);
  const isAnimated = animatedStatuses.includes(status);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        display.bgClass,
        display.textClass,
        paddingClasses[size],
      )}
    >
      <span
        className={cn(
          'shrink-0 rounded-full',
          dotSizeClasses[size],
          display.textClass.replace('text-', 'bg-'),
          isAnimated && 'animate-pulse',
        )}
      />
      {display.label}
    </span>
  );
}
