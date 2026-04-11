'use client';

import * as React from 'react';
import { Globe, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/layout/empty-state';

interface PreviewFrameProps {
  url?: string;
  title?: string;
}

export function PreviewFrame({ url, title = 'Preview' }: PreviewFrameProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [key, setKey] = React.useState(0);

  function handleReload() {
    // Increment key to force iframe remount, which reloads it
    setKey((k) => k + 1);
  }

  if (!url) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[#09090b]">
        <EmptyState
          icon={<Globe className="h-5 w-5" />}
          title="No preview available"
          description="Start a session and expose a port to see the preview here."
        />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-[#09090b]">
      {/* URL bar */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/[0.07] px-3">
        <Globe className="h-3.5 w-3.5 shrink-0 text-[#52525b]" />
        <span
          className="flex-1 truncate text-xs text-[#71717a] font-mono"
          title={url}
        >
          {url}
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
          src={url}
          title={title}
          className={cn(
            'absolute inset-0 h-full w-full border-0 bg-white',
          )}
          sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts allow-top-navigation-by-user-activation"
        />
      </div>
    </div>
  );
}
