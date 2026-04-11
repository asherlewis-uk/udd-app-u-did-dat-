'use client';

import * as React from 'react';
import { Play, Square, Server, Clock, CalendarClock, Timer } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { SessionStatusBadge } from './session-status-badge';
import { apiClient } from '@/lib/api-client';
import { formatRelativeTime, elapsedDuration } from '@/lib/format';
import type { Session } from '@udd/contracts';

interface SessionCardProps {
  session: Session;
  onRefresh(): void;
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 text-xs text-[#71717a]">
      <span className="shrink-0 text-[#52525b]">{icon}</span>
      <span className="text-[#52525b]">{label}:</span>
      <span className="text-[#a1a1aa] font-mono truncate">{value}</span>
    </div>
  );
}

export function SessionCard({ session, onRefresh }: SessionCardProps) {
  const [isActioning, setIsActioning] = React.useState(false);

  const canStart =
    session.state === 'stopped' || session.state === 'failed';
  const canStop =
    session.state === 'running' ||
    session.state === 'idle' ||
    session.state === 'starting';

  async function handleStart() {
    setIsActioning(true);
    try {
      await apiClient.startSession(session.id);
      onRefresh();
    } finally {
      setIsActioning(false);
    }
  }

  async function handleStop() {
    setIsActioning(true);
    try {
      await apiClient.stopSession(session.id);
      onRefresh();
    } finally {
      setIsActioning(false);
    }
  }

  const shortId = session.id.slice(0, 8) + '…';
  const elapsed =
    session.startedAt
      ? elapsedDuration(session.startedAt, session.stoppedAt ?? undefined)
      : null;

  return (
    <div
      className={cn(
        'rounded-lg border border-white/[0.07] bg-[#18181b] p-4',
        'transition-colors hover:border-white/[0.12]',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          {/* ID + badge */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-sm font-medium text-[#fafafa]">{shortId}</span>
            <SessionStatusBadge state={session.state} size="sm" />
          </div>

          {/* Meta rows */}
          <div className="space-y-1.5">
            {session.workerHost && (
              <MetaRow
                icon={<Server className="h-3 w-3" />}
                label="Host"
                value={
                  session.hostPort
                    ? `${session.workerHost}:${session.hostPort}`
                    : session.workerHost
                }
              />
            )}
            {session.startedAt && (
              <MetaRow
                icon={<CalendarClock className="h-3 w-3" />}
                label="Started"
                value={formatRelativeTime(session.startedAt)}
              />
            )}
            {session.stoppedAt && (
              <MetaRow
                icon={<Clock className="h-3 w-3" />}
                label="Stopped"
                value={formatRelativeTime(session.stoppedAt)}
              />
            )}
            {elapsed && (
              <MetaRow
                icon={<Timer className="h-3 w-3" />}
                label="Duration"
                value={elapsed}
              />
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1.5">
          {canStart && (
            <Button
              variant="secondary"
              size="sm"
              loading={isActioning}
              onClick={handleStart}
              aria-label="Start session"
            >
              <Play className="h-3.5 w-3.5" />
              Start
            </Button>
          )}
          {canStop && (
            <Button
              variant="secondary"
              size="sm"
              loading={isActioning}
              onClick={handleStop}
              aria-label="Stop session"
            >
              <Square className="h-3.5 w-3.5" />
              Stop
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
