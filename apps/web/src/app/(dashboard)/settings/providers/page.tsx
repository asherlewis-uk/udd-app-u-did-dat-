'use client';

import * as React from 'react';
import { useParams } from 'next/navigation';
import useSWR from 'swr';
import { Plus, Trash2, RefreshCw, Key, Settings, Cpu, Shield } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/format';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@/components/ui/select';
import type { ProviderConfig, ProviderType, AuthScheme, ModelCatalogMode } from '@udd/contracts';

/* ------------------------------------------------------------------ */
/*  Reuse SettingsNav from the parent settings page                    */
/* ------------------------------------------------------------------ */

import { SettingsNav } from '../settings-nav';

const NAV_ITEMS = [
  { label: 'General', href: '/settings', icon: <Settings className="h-4 w-4" /> },
  { label: 'AI Providers', href: '/settings/providers', icon: <Cpu className="h-4 w-4" /> },
];

/* ------------------------------------------------------------------ */
/*  Provider dot color by provider type                                */
/* ------------------------------------------------------------------ */

const PROVIDER_DOT_COLORS: Record<string, string> = {
  openai: 'bg-emerald-400',
  anthropic: 'bg-orange-400',
  google: 'bg-blue-400',
};

const ENDPOINT_PLACEHOLDERS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  google: 'https://generativelanguage.googleapis.com/v1beta',
  openai_compatible: 'https://your-endpoint.example.com/v1',
  self_hosted: 'http://localhost:8080/v1',
};

/* ------------------------------------------------------------------ */
/*  Add Provider Dialog                                                */
/* ------------------------------------------------------------------ */

function AddProviderDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {

  const [name, setName] = React.useState('');
  const [providerType, setProviderType] = React.useState<ProviderType>('openai');
  const [endpointUrl, setEndpointUrl] = React.useState('');
  const [authScheme, setAuthScheme] = React.useState<AuthScheme>('api_key_header');
  const [modelCatalogMode, setModelCatalogMode] = React.useState<ModelCatalogMode>('manual');
  const [credential, setCredential] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function reset() {
    setName('');
    setProviderType('openai');
    setEndpointUrl('');
    setAuthScheme('api_key_header');
    setModelCatalogMode('manual');
    setCredential('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !endpointUrl.trim() || !credential.trim()) return;

    setIsSubmitting(true);
    try {
      await apiClient.createProvider({
        name: name.trim(),
        providerType,
        endpointUrl: endpointUrl.trim(),
        modelCatalogMode,
        authScheme,
        credential: credential.trim(),
      });
      reset();
      onOpenChange(false);
      onSuccess();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add AI Provider</DialogTitle>
          <DialogDescription>Configure a new AI provider for your account.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label required>Name</Label>
            <Input
              placeholder="My OpenAI key"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label required>Provider Type</Label>
            <Select value={providerType} onValueChange={(v) => setProviderType(v as ProviderType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="openai_compatible">OpenAI Compatible</SelectItem>
                <SelectItem value="self_hosted">Self-Hosted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label required>Endpoint URL</Label>
            <Input
              placeholder={ENDPOINT_PLACEHOLDERS[providerType] ?? 'https://...'}
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label required>Auth Scheme</Label>
            <Select value={authScheme} onValueChange={(v) => setAuthScheme(v as AuthScheme)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="api_key_header">API Key Header</SelectItem>
                <SelectItem value="bearer_token">Bearer Token</SelectItem>
                <SelectItem value="custom_header">Custom Header</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label required>Credential</Label>
            <Input
              type="password"
              placeholder="sk-..."
              value={credential}
              onChange={(e) => setCredential(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isSubmitting}
              disabled={!name.trim() || !endpointUrl.trim() || !credential.trim()}
            >
              Add Provider
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete confirmation dialog                                         */
/* ------------------------------------------------------------------ */

function DeleteDialog({
  open,
  onOpenChange,
  providerName,
  onConfirm,
  isDeleting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerName: string;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Provider</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{providerName}</strong>? This action cannot be
            undone. Any pipelines using this provider will fail.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" loading={isDeleting} onClick={onConfirm}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Providers page                                                     */
/* ------------------------------------------------------------------ */

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? '/v1';

export default function ProvidersPage() {
  const { user } = useAuth();
  const token = user?.token ?? null;

  const fetcher = React.useCallback(
    async (url: string) => {
      const res = await fetch(url, {
        headers: token ? { authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`API error ${res.status}`);
      return res.json() as Promise<{ data: ProviderConfig[] }>;
    },
    [token],
  );

  const { data, isLoading, mutate } = useSWR<{ data: ProviderConfig[] }>(
    token ? `${API_BASE}/me/ai/providers` : null,
    fetcher,
  );

  const providers = data?.data ?? [];

  const [addOpen, setAddOpen] = React.useState(false);
  const [deleteTarget, setDeleteTarget] = React.useState<ProviderConfig | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [rotatingId, setRotatingId] = React.useState<string | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await apiClient.deleteProvider(deleteTarget.id);
      setDeleteTarget(null);
      void mutate();
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleRotate(prov: ProviderConfig) {
    const newKey = prompt('Enter new credential:');
    if (!newKey?.trim()) return;
    setRotatingId(prov.id);
    try {
      await apiClient.rotateProviderSecret(prov.id, {
        newCredential: newKey.trim(),
      });
      void mutate();
    } finally {
      setRotatingId(null);
    }
  }

  const breadcrumbs = [
    { label: 'Settings', href: '/settings' },
    { label: 'Providers' },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader
        title="AI Providers"
        description="Manage API keys for AI model providers."
        breadcrumbs={breadcrumbs}
        actions={
          <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" />
            Add Provider
          </Button>
        }
      />

      <div className="flex gap-8 p-6">
        <SettingsNav
          items={NAV_ITEMS}
          currentPath="/settings/providers"
        />

        <div className="min-w-0 flex-1">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-lg" />
              ))}
            </div>
          ) : providers.length === 0 ? (
            <EmptyState
              icon={<Key className="h-5 w-5" />}
              title="No providers configured"
              description="Add an AI provider to start using pipelines."
              action={
                <Button variant="primary" size="sm" onClick={() => setAddOpen(true)}>
                  <Plus className="h-3.5 w-3.5" />
                  Add Provider
                </Button>
              }
            />
          ) : (
            <div className="space-y-2">
              {providers.map((prov) => (
                <div
                  key={prov.id}
                  className="flex items-center gap-4 rounded-lg border border-white/[0.07] bg-[#18181b] px-4 py-3 transition-colors hover:border-white/[0.12]"
                >
                  {/* Dot + name */}
                  <span
                    className={cn(
                      'h-2.5 w-2.5 shrink-0 rounded-full',
                      PROVIDER_DOT_COLORS[prov.providerType] ?? 'bg-zinc-500',
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-[#fafafa]">{prov.name}</p>
                    <p className="mt-0.5 text-xs text-[#71717a]">
                      {prov.endpointUrl} &middot; {formatRelativeTime(prov.createdAt)}
                    </p>
                  </div>

                  {/* Badges */}
                  <Badge variant="outline" size="sm">
                    {prov.providerType}
                  </Badge>
                  <Badge variant={prov.isActive ? 'success' : 'default'} size="sm">
                    {prov.isActive ? 'Active' : 'Inactive'}
                  </Badge>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleRotate(prov)}
                      disabled={rotatingId === prov.id}
                      title="Rotate API key"
                    >
                      <RefreshCw
                        className={cn('h-3.5 w-3.5', rotatingId === prov.id && 'animate-spin')}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-[#71717a] hover:text-red-400"
                      onClick={() => setDeleteTarget(prov)}
                      title="Delete provider"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <AddProviderDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => void mutate()}
      />
      <DeleteDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        providerName={deleteTarget?.name ?? ''}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
}
