'use client';

import * as React from 'react';
import { TerminalSquare } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ScrollArea } from '@/components/ui/scroll-area';

interface TerminalPaneProps {
  lines?: string[];
  isConnected?: boolean;
  height?: string;
}

export function TerminalPane({
  lines = [],
  isConnected = false,
  height = '100%',
}: TerminalPaneProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever lines change
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  return (
    <div
      className="flex flex-col bg-[#09090b] font-mono"
      style={{ height }}
    >
      {/* Header bar */}
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-white/[0.07] px-3">
        <TerminalSquare className="h-3.5 w-3.5 text-[#52525b]" />
        <span className="text-xs font-medium text-[#a1a1aa]">Terminal</span>

        <div className="ml-auto flex items-center gap-1.5">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              isConnected ? 'bg-emerald-400' : 'bg-[#3f3f46]',
            )}
          />
          <span className="text-[10px] text-[#52525b]">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Output area */}
      <ScrollArea className="flex-1">
        <div className="p-3">
          {lines.length === 0 ? (
            <p className="text-xs text-[#3f3f46] italic">
              Session terminal — connect a session to see output
            </p>
          ) : (
            <div className="space-y-0.5">
              {lines.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    'whitespace-pre-wrap break-all text-xs leading-5',
                    line.startsWith('[error]') || line.startsWith('Error')
                      ? 'text-red-400'
                      : line.startsWith('[warn]') || line.startsWith('Warning')
                        ? 'text-amber-400'
                        : 'text-[#a1a1aa]',
                  )}
                >
                  {line}
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
}
