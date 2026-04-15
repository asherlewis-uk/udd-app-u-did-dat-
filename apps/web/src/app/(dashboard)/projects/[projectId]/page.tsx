'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Layers, TerminalSquare, CalendarDays, Code2, AlignLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useProject, useProjectSessions } from '@/hooks/use-projects';

import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { SessionCard } from '@/components/sessions/session-card';
import { SessionActions } from '@/components/sessions/session-actions';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatRelativeTime } from '@/lib/format';

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 shrink-0 text-[#52525b]">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-[#52525b]">{label}</p>
        <p className="mt-0.5 text-sm text-[#a1a1aa] break-words">{value}</p>
      </div>
    </div>
  );
}

export default function ProjectPage() {
  const params = useParams<{ projectId: string }>();
  const { projectId } = params;

  const { user } = useAuth();
  const token = user?.token ?? null;

  const { project, isLoading: projectLoading } = useProject(token, projectId);
  const { sessions, isLoading: sessionsLoading, mutate } = useProjectSessions(token, projectId);

  const breadcrumbs = [
    { label: 'Workspaces', href: '/workspaces' },
    { label: project?.name ?? projectId },
  ];

  const editorHref = `/projects/${projectId}/editor` as const;

  return (
    <div className="flex flex-col">
      <PageHeader
        title={project?.name ?? projectId}
        breadcrumbs={breadcrumbs}
        actions={
          <Link href={editorHref}>
            <Button variant="primary" size="sm">
              <Code2 className="h-3.5 w-3.5" />
              Launch Editor
            </Button>
          </Link>
        }
      />

      <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-start">
        {/* ── Main: sessions ── */}
        <div className="min-w-0 flex-[2]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-[#fafafa]">Sessions</h2>
            <SessionActions projectId={projectId} onRefresh={() => void mutate()} />
          </div>

          {sessionsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={<TerminalSquare className="h-5 w-5" />}
              title="No sessions yet"
              description="Create a session to spin up a cloud container for this project."
              action={<SessionActions projectId={projectId} onRefresh={() => void mutate()} />}
            />
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => (
                <SessionCard key={session.id} session={session} onRefresh={() => void mutate()} />
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar: project info ── */}
        <aside className="w-full shrink-0 lg:w-72">
          <div className="rounded-lg border border-white/[0.07] bg-[#18181b] p-4">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[#52525b]">
              Project Info
            </h3>

            {projectLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : (
              <div className="space-y-4">
                {project?.description && (
                  <InfoRow
                    icon={<AlignLeft className="h-3.5 w-3.5" />}
                    label="Description"
                    value={project.description}
                  />
                )}

                <InfoRow
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label="Created"
                  value={formatRelativeTime(project?.createdAt)}
                />

                <InfoRow
                  icon={<Layers className="h-3.5 w-3.5" />}
                  label="Sessions"
                  value={
                    sessionsLoading
                      ? '—'
                      : `${sessions.length} ${sessions.length === 1 ? 'session' : 'sessions'}`
                  }
                />

                <Separator className="bg-white/[0.07]" />

                <Link href={editorHref} className="block">
                  <Button variant="primary" size="md" className="w-full">
                    <Code2 className="h-4 w-4" />
                    Launch Editor
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
