'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Plus, Shield, Settings, Cpu, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/contexts/auth-context';
import { useWorkspace } from '@/hooks/use-workspaces';
import { apiClient } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import type { AgentRole } from '@udd/contracts';

import { SettingsNav } from '../page';

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NAV_ITEMS = [
  { label: 'General', href: '/settings', icon: <Settings className="h-4 w-4" /> },
  { label: 'AI Providers', href: '/settings/providers', icon: <Cpu className="h-4 w-4" /> },
  { label: 'Agent Roles', href: '/settings/roles', icon: <Shield className="h-4 w-4" /> },
];

const ALL_PERMISSIONS = [
  'read:sessions',
  'write:sessions',
  'read:projects',
  'write:projects',
  'read:pipelines',
  'run:pipelines',
  'manage:providers',
  'manage:members',
] as const;

type Permission = (typeof ALL_PERMISSIONS)[number];

/* ------------------------------------------------------------------ */
/*  Permission checkbox list                                           */
/* ------------------------------------------------------------------ */

function PermissionCheckboxes({
  selected,
  onChange,
}: {
  selected: Set<Permission>;
  onChange: (perm: Permission, checked: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {ALL_PERMISSIONS.map((perm) => {
        const checked = selected.has(perm);
        return (
          <label
            key={perm}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors',
              checked
                ? 'border-[#6366f1]/40 bg-[#6366f1]/[0.06] text-[#c7d2fe]'
                : 'border-white/[0.07] bg-transparent text-[#71717a] hover:border-white/[0.12] hover:text-[#a1a1aa]',
            )}
          >
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onChange(perm, e.target.checked)}
              className="sr-only"
            />
            <span
              className={cn(
                'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                checked
                  ? 'border-[#6366f1] bg-[#6366f1]'
                  : 'border-white/[0.2] bg-transparent',
              )}
            >
              {checked && (
                <svg className="h-3 w-3 text-white" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 6L5 8.5L9.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
            <span className="font-mono">{perm}</span>
          </label>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  New Role Dialog                                                    */
/* ------------------------------------------------------------------ */

function NewRoleDialog({
  open,
  onOpenChange,
  workspaceId,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  onSuccess: () => void;
}) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [permissions, setPermissions] = React.useState<Set<Permission>>(new Set());
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function reset() {
    setName('');
    setDescription('');
    setPermissions(new Set());
  }

  function handlePermToggle(perm: Permission, checked: boolean) {
    setPermissions((prev) => {
      const next = new Set(prev);
      if (checked) next.add(perm);
      else next.delete(perm);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || permissions.size === 0) return;

    setIsSubmitting(true);
    try {
      await apiClient.createRole(workspaceId, {
        name: name.trim(),
        description: description.trim() || undefined,
        permissions: [...permissions],
      } as never);
      reset();
      onOpenChange(false);
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Agent Role</DialogTitle>
          <DialogDescription>
            Define a role with specific permissions for AI agents.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Name</Label>
            <Input
              placeholder="e.g. Code Reviewer"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              placeholder="Describe what this role is for..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label required>Permissions</Label>
            <PermissionCheckboxes
              selected={permissions}
              onChange={handlePermToggle}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
              disabled={!name.trim() || permissions.size === 0}
            >
              Create Role
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Roles page                                                         */
/* ------------------------------------------------------------------ */

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? '/v1';

export default function RolesPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const token = user?.token ?? null;
  const { workspace } = useWorkspace(token, workspaceId);

  const fetcher = React.useCallback(
    async (url: string) => {
      const res = await fetch(url, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      return res.json() as Promise<{ data: AgentRole[] }>;
    },
    [token],
  );

  const { data, isLoading, mutate } = useSWR<{ data: AgentRole[] }>(
    token ? `${API_BASE}/workspaces/${workspaceId}/ai/roles` : null,
    fetcher,
  );

  const roles = data?.data ?? [];
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const breadcrumbs = [
    { label: 'Workspaces', href: '/workspaces' },
    { label: workspace?.name ?? workspaceId, href: `/workspaces/${workspaceId}` },
    { label: 'Settings', href: `/workspaces/${workspaceId}/settings` },
    { label: 'Roles' },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Agent Roles"
        description="Define roles and permissions for AI agents."
        breadcrumbs={breadcrumbs}
        actions={
          <Button variant="primary" size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            New Role
          </Button>
        }
      />

      <div className="flex gap-8 p-6">
        <SettingsNav
          items={NAV_ITEMS}
          currentPath="/settings/roles"
          workspaceId={workspaceId}
        />

        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-lg" />
              ))}
            </div>
          ) : roles.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-5 w-5" />}
              title="No roles defined"
              description="Create agent roles to control what AI agents can do in your workspace."
              action={
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setDialogOpen(true)}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New Role
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {roles.map((role) => (
                <div
                  key={role.id}
                  className="flex flex-col gap-3 rounded-lg border border-white/[0.07] bg-[#18181b] p-4 transition-colors hover:border-white/[0.12]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#6366f1]/10">
                      <Shield className="h-4 w-4 text-[#6366f1]" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[#fafafa]">
                        {role.name}
                      </p>
                      {role.description && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-[#71717a]">
                          {role.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {role.permissions.map((perm) => (
                      <Badge key={perm} variant="outline" size="sm">
                        {perm}
                      </Badge>
                    ))}
                  </div>

                  <p className="mt-auto text-[10px] text-[#52525b]">
                    Created {formatRelativeTime(role.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <NewRoleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={workspaceId}
        onSuccess={() => void mutate()}
      />
    </div>
  );
}
