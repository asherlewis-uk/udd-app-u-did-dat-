'use client';

import useSWR from 'swr';
import type { PipelineRunRecord, PipelineDefinition } from '@udd/contracts';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? '/v1';

function makeApiFetcher(token: string | null) {
  return async (url: string) => {
    const res = await fetch(url, {
      headers: token ? { authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const err = new Error(`API error ${res.status}`) as Error & { status: number };
      err.status = res.status;
      throw err;
    }
    return res.json();
  };
}

export function usePipelineRuns(token: string | null, projectId: string | null) {
  const fetcher = makeApiFetcher(token);
  const { data, error, isLoading, mutate } = useSWR<{ data: PipelineRunRecord[] }>(
    token && projectId ? `${API_BASE}/projects/${projectId}/ai/runs` : null,
    fetcher,
    { refreshInterval: 10_000 },
  );

  return {
    runs: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function usePipelines(token: string | null, projectId: string | null) {
  const fetcher = makeApiFetcher(token);
  const { data, error, isLoading, mutate } = useSWR<{ data: PipelineDefinition[] }>(
    token && projectId ? `${API_BASE}/projects/${projectId}/ai/pipelines` : null,
    fetcher,
  );

  return {
    pipelines: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
}
