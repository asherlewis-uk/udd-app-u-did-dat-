'use client';

import Link from 'next/link';
import { Layers, CalendarDays, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatRelativeTime } from '@/lib/format';
import type { ProjectView } from '@udd/contracts';

interface ProjectCardProps {
  project: ProjectView;
  sessionCount?: number;
}

export function ProjectCard({ project, sessionCount }: ProjectCardProps) {
  const href = `/projects/${project.id}` as const;

  return (
    <Link
      href={href}
      className={cn(
        'group flex flex-col gap-3 rounded-lg border border-white/[0.07] bg-[#18181b] p-4',
        'transition-all duration-150',
        'hover:border-[#6366f1]/40 hover:shadow-[0_0_0_1px_rgba(99,102,241,0.15)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-2 focus-visible:ring-offset-[#09090b]',
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-[#6366f1]/10 text-[#6366f1] transition-colors group-hover:bg-[#6366f1]/15">
          <FolderOpen className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-[#fafafa]">
            {project.name}
          </p>
          {project.description && (
            <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-[#71717a]">
              {project.description}
            </p>
          )}
        </div>
      </div>

      <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-[#52525b]">
        <div className="flex items-center gap-1.5">
          <CalendarDays className="h-3 w-3 shrink-0" />
          <span>{formatRelativeTime(project.createdAt)}</span>
        </div>

        {sessionCount !== undefined && (
          <div className="flex items-center gap-1 text-[#71717a]">
            <Layers className="h-3 w-3 shrink-0" />
            <span>
              {sessionCount} {sessionCount === 1 ? 'session' : 'sessions'}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}