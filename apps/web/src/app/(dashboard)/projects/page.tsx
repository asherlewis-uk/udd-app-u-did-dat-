'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FolderOpen, ChevronRight, LogOut, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useProjects } from '@/hooks/use-projects';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/layout/empty-state';
import { formatRelativeTime } from '@/lib/format';

export default function ProjectsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { projects, isLoading } = useProjects(user?.token ?? null);

  function handleLogout() {
    logout();
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-[#09090b]">
      {/* Top bar */}
      <header className="border-b border-white/[0.07] bg-[#0f0f12] px-6 py-4">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600">
              <span className="text-xs font-bold text-white">U</span>
            </div>
            <span className="text-sm font-semibold text-[#fafafa]">UDD Platform</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-3.5 w-3.5" />
            Sign out
          </Button>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-[#fafafa]">Projects</h1>
            <p className="mt-1 text-sm text-[#a1a1aa]">
              Select a project to continue.
            </p>
          </div>
          <Button variant="primary" size="sm" className="gap-2">
            <Plus className="h-4 w-4" />
            New project
          </Button>
        </div>

        {isLoading ? (
          <div className="grid gap-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[72px] w-full rounded-xl" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-6 w-6" />}
            title="No projects yet"
            description="Create your first project to start building."
            action={
              <Button variant="primary" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Create project
              </Button>
            }
          />
        ) : (
          <div className="grid gap-2">
            {projects.map((proj) => (
              <Link
                key={proj.id}
                href={`/projects/${proj.id}`}
                className="group flex items-center gap-4 rounded-xl border border-white/[0.07] bg-[#18181b] px-5 py-4 transition-all hover:border-white/[0.12] hover:bg-[#1c1c20]"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-400">
                  <FolderOpen className="h-5 w-5" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="font-semibold text-[#fafafa]">{proj.name}</p>
                  <p className="text-sm text-[#71717a]">
                    {proj.slug} · Updated {formatRelativeTime(proj.updatedAt)}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#71717a] transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
