'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { FolderOpen, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useProjects } from '@/hooks/use-projects';
import { useWorkspace } from '@/hooks/use-workspaces';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { ProjectCard } from '@/components/projects/project-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export default function WorkspacePage() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId;

  const { user } = useAuth();
  const token = user?.token ?? null;

  const { workspace } = useWorkspace(token, workspaceId);
  const { projects, isLoading } = useProjects(token, workspaceId);

  const breadcrumbs = [
    { label: 'Workspaces', href: '/workspaces' },
    { label: workspace?.name ?? workspaceId },
  ];

  const actions = (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span tabIndex={0}>
            <Button variant="primary" size="sm" disabled>
              <Plus className="h-3.5 w-3.5" />
              New Project
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>Coming soon</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );

  return (
    <div className="flex flex-col">
      <PageHeader
        title={workspace?.name ?? 'Projects'}
        breadcrumbs={breadcrumbs}
        actions={actions}
      />

      <div className="p-6">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <EmptyState
            icon={<FolderOpen className="h-5 w-5" />}
            title="No projects yet"
            description="Create your first project to start coding in the cloud."
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                workspaceId={workspaceId}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
