'use client';

import * as React from 'react';
import { Settings, Cpu, Copy, Check } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SettingsNav } from './settings-nav';
import type { SettingsNavItem } from './settings-nav';

const NAV_ITEMS: SettingsNavItem[] = [
  { label: 'General', href: '/settings', icon: <Settings className="h-4 w-4" /> },
  { label: 'AI Providers', href: '/settings/providers', icon: <Cpu className="h-4 w-4" /> },
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
  const { user } = useAuth();
  const [copied, setCopied] = React.useState(false);

  function handleCopyId() {
    if (!user) return;
    void navigator.clipboard.writeText(user.userId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const breadcrumbs = [
    { label: 'Settings', href: '/settings' },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="Settings"
        description="Manage your account and provider settings."
        breadcrumbs={breadcrumbs}
      />

      <div className="flex gap-8 p-6">
        <SettingsNav items={NAV_ITEMS} currentPath="/settings" />

        <div className="min-w-0 flex-1">
          <div className="rounded-lg border border-white/[0.07] bg-[#18181b] p-5">
            <h3 className="text-sm font-semibold text-[#fafafa] mb-5">General</h3>

              <div className="space-y-5">
                <InfoRow
                  icon={<Settings className="h-3.5 w-3.5" />}
                  label="User"
                  value={
                    <span className="font-medium text-[#fafafa]">{user?.userId ?? '—'}</span>
                  }
                />

                <Separator className="bg-white/[0.07]" />

                <InfoRow
                  icon={<Copy className="h-3.5 w-3.5" />}
                  label="User ID"
                  value={<code className="font-mono text-xs text-[#71717a]">{user?.userId ?? '—'}</code>}
                  action={
                    <Button variant="ghost" size="sm" onClick={handleCopyId} className="h-7" disabled={!user}>
                      {copied ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {copied ? 'Copied' : 'Copy'}
                    </Button>
                  }
                />
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}
