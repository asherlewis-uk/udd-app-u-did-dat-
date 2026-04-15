'use client';

import * as React from 'react';
import { Globe, RefreshCw, MonitorX } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/layout/empty-state';

/* ------------------------------------------------------------------ */
/*  Preview state for the editor surface                               */
/* ------------------------------------------------------------------ */

export type PreviewStatus =
  /** No active session — nothing to preview */
  | 'no-session'
  /** Session is active but no preview binding exists yet */
  | 'no-binding'
  /** Preview is available and can be loaded via token-authenticated URL */
  | 'available';

interface PreviewFrameProps {
  /** Current preview lifecycle status */
  status?: PreviewStatus;
  /** Gateway preview URL with preview_token param (set when available) */
  previewUrl?: string | undefined;
  /** Display URL (without token, for the URL bar) */
  displayUrl?: string | undefined;
  title?: string;
  /** Callback to request a fresh preview token (token refresh) */
  onRefreshToken?: () => void;
}

export function PreviewFrame({
  status = 'no-session',
  previewUrl,
  displayUrl,
  title = 'Preview',
  onRefreshToken,
}: PreviewFrameProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [key, setKey] = React.useState(0);

  function handleReload() {
    onRefreshToken?.();
    setKey((k) => k + 1);
  }

  /* ── No session ── */
  if (status === 'no-session') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#09090b]">
        <EmptyState
          icon={<Globe className="h-5 w-5" />}
          title="No preview available"
          description="Start a session to enable the preview."
        />
      </div>
    );
  }

  /* ── Session active but no preview binding ── */
  if (status === 'no-binding') {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#09090b]">
        <EmptyState
          icon={<MonitorX className="h-5 w-5" />}
          title="No preview binding"
          description="The session is running but no preview has been created yet. A preview binding will appear once the session exposes a port."
        />
      </div>
    );
  }

  /* ── Available — token-authenticated preview URL ── */
  if (!previewUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#09090b]">
        <EmptyState
          icon={<Globe className="h-5 w-5" />}
          title="No preview available"
          description="Start a session to enable the preview."
        />
      </div>
    );
  }

  const barUrl = displayUrl ?? previewUrl;

  return (
    <div className="flex h-full flex-col bg-[#09090b]">
      {/* URL bar */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/[0.07] px-3">
        <Globe className="h-3.5 w-3.5 shrink-0 text-[#52525b]" />
        <span className="flex-1 truncate text-xs text-[#71717a] font-mono" title={barUrl}>
          {barUrl}
        </span>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReload}
          className="h-6 w-6"
          aria-label="Reload preview"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* iframe */}
      <div className="relative flex-1">
        <iframe
          key={key}
          ref={iframeRef}
          src={previewUrl}
          title={title}
          className={cn('absolute inset-0 h-full w-full border-0 bg-white')}
          sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
        />
      </div>
    </div>
  );
}
