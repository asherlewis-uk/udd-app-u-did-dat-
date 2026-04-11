'use client';

import useSWR from 'swr';
import type { Workspace } from '@udd/contracts';

interface Page<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

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
    return res.json() as Promise<{ data: unknown; meta?: unknown }>;
  };
}

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? '/v1';

export function useWorkspaces(token: string | null) {
  const fetcher = makeApiFetcher(token);
  const { data, error, isLoading, mutate } = useSWR<{ data: Workspace[] }>(
    token ? `${API_BASE}/workspaces` : null,
    fetcher,
  );

  return {
    workspaces: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
}

export function useWorkspace(token: string | null, workspaceId: string | null) {
  const fetcher = makeApiFetcher(token);
  const { data, error, isLoading } = useSWR<{ data: Workspace }>(
    token && workspaceId ? `${API_BASE}/workspaces/${workspaceId}` : null,
    fetcher,
  );

  return {
    workspace: data?.data ?? null,
    isLoading,
    error,
  };
}

export function useWorkspaceMembers(token: string | null, workspaceId: string | null) {
  const fetcher = makeApiFetcher(token);
  const { data, error, isLoading, mutate } = useSWR<{ data: unknown[]; meta: Page<unknown> }>(
    token && workspaceId ? `${API_BASE}/workspaces/${workspaceId}/members` : null,
    fetcher,
  );

  return {
    members: data?.data ?? [],
    isLoading,
    error,
    mutate,
  };
}
