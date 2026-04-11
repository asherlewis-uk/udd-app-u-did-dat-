'use client';

import * as React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

export interface SettingsNavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

export function SettingsNav({
  items,
  currentPath,
  workspaceId,
}: {
  items: SettingsNavItem[];
  currentPath: string;
  workspaceId: string;
}) {
  return (
    <nav className="w-[200px] shrink-0 space-y-0.5">
      {items.map((item) => {
        const isActive = currentPath === item.href;
        return (
          <Link
            key={item.href}
            href={`/workspaces/${workspaceId}${item.href}`}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              isActive
                ? 'bg-white/[0.06] text-[#fafafa] font-medium'
                : 'text-[#71717a] hover:bg-white/[0.04] hover:text-[#a1a1aa]',
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
