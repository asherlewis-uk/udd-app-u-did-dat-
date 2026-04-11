'use client';

import useSWR from 'swr';
import type { Project, Session } from '@udd/contracts';

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

export function useProjects(token: string | null, workspaceId: string | null) {
  const fetcher = makeApiFetcher(token);
  const { data, error, isLoading, mutate } = useSWR<{ data: Project[] }>(
    token && workspaceId ? `${API_BASE}/workspaces/${workspaceId}/projects` : null,
    fetcher,
  );

  return {
    projects: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useProject(token: string | null, projectId: string | null) {
  const fetcher = makeApiFetcher(token);
  const { data, error, isLoading } = useSWR<{ data: Project }>(
    token && projectId ? `${API_BASE}/projects/${projectId}` : null,
    fetcher,
  );

  return {
    project: data?.data ?? null,
    isLoading,
    error,
  };
}

export function useProjectSessions(token: string | null, projectId: string | null) {
  const fetcher = makeApiFetcher(token);
  const { data, error, isLoading, mutate } = useSWR<{ data: Session[] }>(
    token && projectId ? `${API_BASE}/projects/${projectId}/sessions` : null,
    fetcher,
    { refreshInterval: 5000 }, // poll every 5s for session state changes
  );

  return {
    sessions: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
}
