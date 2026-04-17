'use client';

import * as React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Zap, GitBranch, Plus, Calendar, Cpu } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { usePipelines, usePipelineRuns } from '@/hooks/use-pipeline-runs';
import { formatRelativeTime } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { PipelineRunCard } from '@/components/ai/pipeline-run-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';

export default function AiHubPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const token = user?.token ?? null;

  const { pipelines, isLoading: pipelinesLoading } = usePipelines(token, projectId);
  const { runs, isLoading: runsLoading, mutate: mutateRuns } = usePipelineRuns(token, projectId);

  const sortedRuns = [...runs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  function handleRefresh() {
    void mutateRuns();
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="AI Hub"
        description="Manage AI pipelines, monitor runs, and configure providers."
        actions={
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button variant="primary" size="sm" disabled>
                    <Plus className="h-3.5 w-3.5" />
                    New Pipeline
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Coming soon</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
      />

      <div className="flex-1 overflow-y-auto p-6">
        <Tabs defaultValue="runs">
          <TabsList className="mb-6">
            <TabsTrigger value="runs">
              <Zap className="h-3.5 w-3.5" />
              Runs
            </TabsTrigger>
            <TabsTrigger value="pipelines">
              <GitBranch className="h-3.5 w-3.5" />
              Pipelines
            </TabsTrigger>
          </TabsList>

          {/* ── Runs tab ── */}
          <TabsContent value="runs" className="space-y-3">
            {runsLoading ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
                ))}
              </>
            ) : sortedRuns.length === 0 ? (
              <EmptyState
                icon={<Zap className="h-5 w-5" />}
                title="No pipeline runs yet"
                description="Trigger a pipeline to see runs here."
              />
            ) : (
              sortedRuns.map((run) => (
                <PipelineRunCard
                  key={run.id}
                  run={run}
                  pipelines={pipelines}
                  projectId={projectId}
                  onRefresh={handleRefresh}
                />
              ))
            )}
          </TabsContent>

          {/* ── Pipelines tab ── */}
          <TabsContent value="pipelines">
            {pipelinesLoading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-[140px] w-full rounded-xl" />
                ))}
              </div>
            ) : pipelines.length === 0 ? (
              <EmptyState
                icon={<GitBranch className="h-5 w-5" />}
                title="No pipelines defined"
                description="Create your first AI pipeline."
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pipelines.map((pipeline) => (
                  <div
                    key={pipeline.id}
                    className="flex flex-col gap-3 rounded-xl border border-white/[0.07] bg-[#18181b] p-4 transition-colors hover:border-white/[0.12]"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10">
                        <Cpu className="h-4 w-4 text-indigo-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#fafafa]">
                          {pipeline.name}
                        </p>
                        {pipeline.description && (
                          <p className="mt-0.5 line-clamp-2 text-xs text-[#71717a]">
                            {pipeline.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-[#71717a]">
                      <span>{pipeline.pipelineDefinitionJson.nodes.length} node{pipeline.pipelineDefinitionJson.nodes.length !== 1 ? 's' : ''}</span>
                      <span>&middot;</span>
                      <span>{pipeline.pipelineDefinitionJson.edges.length} edge{pipeline.pipelineDefinitionJson.edges.length !== 1 ? 's' : ''}</span>
                      <span>&middot;</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatRelativeTime(pipeline.createdAt)}
                      </span>
                    </div>

                    <Link
                      href={`/projects/${projectId}/ai/pipelines/${pipeline.id}`}
                      className="self-start rounded-md border border-white/[0.14] px-3 py-1.5 text-xs font-medium text-[#a1a1aa] transition-colors hover:bg-white/[0.04] hover:text-[#fafafa]"
                    >
                      View
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
