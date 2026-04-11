'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import { Settings, Cpu, Shield, Copy, Check, CalendarDays, Users, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useWorkspace } from '@/hooks/use-workspaces';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { formatDateTime } from '@/lib/format';
import { SettingsNav } from './settings-nav';
import type { SettingsNavItem } from './settings-nav';

const NAV_ITEMS: SettingsNavItem[] = [
  { label: 'General', href: '/settings', icon: <Settings className="h-4 w-4" /> },
  { label: 'AI Providers', href: '/settings/providers', icon: <Cpu className="h-4 w-4" /> },
  { label: 'Agent Roles', href: '/settings/roles', icon: <Shield className="h-4 w-4" /> },
];

/* ------------------------------------------------------------------ */
/*  Info row helper                                                    */
/* ------------------------------------------------------------------ */

function InfoRow({
  icon,
  label,
  value,
  action,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3 min-w-0">
        <span className="mt-0.5 shrink-0 text-[#52525b]">{icon}</span>
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-[#52525b]">{label}</p>
          <div className="mt-0.5 text-sm text-[#a1a1aa] break-all">{value}</div>
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  General settings page                                              */
/* ------------------------------------------------------------------ */

export default function SettingsPage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { user } = useAuth();
  const token = user?.token ?? null;
  const { workspace, isLoading } = useWorkspace(token, workspaceId);

  const [copied, setCopied] = React.useState(false);

  function handleCopyId() {
    void navigator.clipboard.writeText(workspaceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const breadcrumbs = [
    { label: 'Workspaces', href: '/workspaces' },
    { label: workspace?.name ?? workspaceId, href: `/workspaces/${workspaceId}` },
    { label: 'Settings' },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Settings"
        description="Configure your workspace settings."
        breadcrumbs={breadcrumbs}
      />

      <div className="flex gap-8 p-6">
        <SettingsNav items={NAV_ITEMS} currentPath="/settings" workspaceId={workspaceId} />

        <div className="min-w-0 flex-1">
          <div className="rounded-lg border border-white/[0.07] bg-[#18181b] p-5">
            <h3 className="text-sm font-semibold text-[#fafafa] mb-5">General</h3>

            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-5 w-72" />
                <Skeleton className="h-5 w-36" />
              </div>
            ) : (
              <div className="space-y-5">
                <InfoRow
                  icon={<Settings className="h-3.5 w-3.5" />}
                  label="Workspace Name"
                  value={
                    <span className="font-medium text-[#fafafa]">{workspace?.name ?? '—'}</span>
                  }
                />

                <Separator className="bg-white/[0.07]" />

                <InfoRow
                  icon={<Copy className="h-3.5 w-3.5" />}
                  label="Workspace ID"
                  value={<code className="font-mono text-xs text-[#71717a]">{workspaceId}</code>}
                  action={
                    <Button variant="ghost" size="sm" onClick={handleCopyId} className="h-7">
                      {copied ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  }
                />

                <Separator className="bg-white/[0.07]" />

                <InfoRow
                  icon={<CalendarDays className="h-3.5 w-3.5" />}
                  label="Created"
                  value={formatDateTime(workspace?.createdAt)}
                />

                <Separator className="bg-white/[0.07]" />

                <InfoRow icon={<Users className="h-3.5 w-3.5" />} label="Members" value="—" />

                <Separator className="bg-white/[0.07]" />

                <InfoRow
                  icon={<Sparkles className="h-3.5 w-3.5" />}
                  label="Plan"
                  value={<Badge variant="purple">Team</Badge>}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
