'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Play, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { usePipelines, usePipelineRuns } from '@/hooks/use-pipeline-runs';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { PipelineGraph } from '@/components/ai/pipeline-graph';
import { PipelineRunCard } from '@/components/ai/pipeline-run-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export default function PipelineDetailPage() {
  const params = useParams<{ projectId: string; pipelineId: string }>();
  const { projectId, pipelineId } = params;
  const router = useRouter();

  const { user } = useAuth();
  const token = user?.token ?? null;

  const { pipelines, isLoading: pipelinesLoading } = usePipelines(token, projectId);
  const { runs, isLoading: runsLoading, mutate: mutateRuns } = usePipelineRuns(token, projectId);

  const [isTriggering, setIsTriggering] = React.useState(false);

  const pipeline = pipelines.find((p) => p.id === pipelineId);
  const pipelineRuns = runs
    .filter((r) => r.pipelineId === pipelineId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  async function handleTriggerRun() {
    setIsTriggering(true);
    try {
      await apiClient.createRun(projectId, pipelineId, { sourceType: 'manual', inputPayload: {} });
      void mutateRuns();
    } finally {
      setIsTriggering(false);
    }
  }

  const breadcrumbs = [
    { label: 'AI Hub', href: `/projects/${projectId}/ai` },
    { label: pipeline?.name ?? pipelineId },
  ];

  if (pipelinesLoading) {
    return (
      <div className="flex flex-col">
        <div className="border-b border-white/[0.07] bg-[#09090b] px-6 py-4">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-7 w-48" />
        </div>
        <div className="space-y-6 p-6">
          <Skeleton className="h-[180px] w-full rounded-xl" />
          <Skeleton className="h-[120px] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="flex flex-col">
        <PageHeader
          title="Pipeline Not Found"
          breadcrumbs={[{ label: 'AI Hub', href: `/projects/${projectId}/ai` }]}
          actions={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => router.push(`/projects/${projectId}/ai`)}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to AI Hub
            </Button>
          }
        />
        <div className="p-6">
          <EmptyState
            title="Pipeline not found"
            description={`Could not find a pipeline with ID "${pipelineId}".`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <PageHeader
        title={pipeline.name}
        breadcrumbs={breadcrumbs}
        actions={
          <Button
            variant="primary"
            size="sm"
            loading={isTriggering}
            onClick={handleTriggerRun}
          >
            <Play className="h-3.5 w-3.5" />
            Trigger Run
          </Button>
        }
      />

      <div className="space-y-8 p-6">
        {/* Pipeline description */}
        {pipeline.description && (
          <p className="text-sm text-[#a1a1aa]">{pipeline.description}</p>
        )}

        {/* DAG Graph */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[#fafafa]">Pipeline Graph</h2>
          <PipelineGraph nodes={pipeline.pipelineDefinitionJson.nodes} edges={pipeline.pipelineDefinitionJson.edges} />
        </section>

        {/* Recent Runs */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-[#fafafa]">Recent Runs</h2>

          {runsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-[88px] w-full rounded-xl" />
              ))}
            </div>
          ) : pipelineRuns.length === 0 ? (
            <EmptyState
              title="No runs yet"
              description="Trigger a run to see results here."
            />
          ) : (
            <div className="space-y-3">
              {pipelineRuns.map((run) => (
                <PipelineRunCard
                  key={run.id}
                  run={run}
                  pipelines={pipelines}
                  projectId={projectId}
                  onRefresh={() => void mutateRuns()}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
