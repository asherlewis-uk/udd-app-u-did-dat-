'use client';

import * as React from 'react';
import { XCircle, Clock, User, Hash } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatRelativeTime, formatDuration } from '@/lib/format';
import { apiClient } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { PipelineRunBadge } from '@/components/ai/pipeline-run-badge';
import type { PipelineRunRecord, PipelineDefinition, PipelineRunStatus } from '@udd/contracts';

const CANCELABLE_STATUSES: PipelineRunStatus[] = ['queued', 'preparing', 'running'];

interface PipelineRunCardProps {
  run: PipelineRunRecord;
  pipelines: PipelineDefinition[];
  workspaceId: string;
  onRefresh(): void;
}

export function PipelineRunCard({
  run,
  pipelines,
  workspaceId,
  onRefresh,
}: PipelineRunCardProps) {
  const [isCanceling, setIsCanceling] = React.useState(false);

  const pipeline = pipelines.find((p) => p.id === run.pipelineId);
  const canCancel = CANCELABLE_STATUSES.includes(run.status);

  const duration =
    run.startedAt && run.finishedAt
      ? formatDuration(
          new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime(),
        )
      : null;

  async function handleCancel() {
    setIsCanceling(true);
    try {
      await apiClient.cancelRun(workspaceId, run.id);
      onRefresh();
    } catch {
      // surface error silently — run remains in cancelable state, user can retry
    } finally {
      setIsCanceling(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#18181b] p-4 transition-colors hover:border-white/[0.12]">
      <div className="flex items-start justify-between gap-4">
        {/* Left side: IDs + pipeline name */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <PipelineRunBadge status={run.status} />
            <span
              className="font-mono text-xs text-[#71717a]"
              title={run.id}
            >
              #{run.id.slice(0, 8)}
            </span>
          </div>

          <p className="mt-1.5 truncate text-sm font-medium text-[#fafafa]">
            {pipeline?.name ?? (
              <span className="text-[#71717a]">Unknown pipeline</span>
            )}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#71717a]">
            {/* Triggered by */}
            <span className="flex items-center gap-1">
              <User className="h-3 w-3 shrink-0" />
              {run.triggeredByUserId}
            </span>

            {/* Start time */}
            {run.startedAt && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 shrink-0" />
                {formatRelativeTime(run.startedAt)}
              </span>
            )}

            {/* Duration */}
            {duration && (
              <span className={cn('flex items-center gap-1')}>
                <Hash className="h-3 w-3 shrink-0" />
                {duration}
              </span>
            )}
          </div>
        </div>

        {/* Right side: actions */}
        {canCancel && (
          <Button
            variant="ghost"
            size="sm"
            loading={isCanceling}
            onClick={handleCancel}
            className="shrink-0 text-[#71717a] hover:text-red-400"
          >
            <XCircle className="h-3.5 w-3.5" />
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
