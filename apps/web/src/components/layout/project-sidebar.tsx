'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { FolderOpen, Cpu, Users, Settings, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/contexts/auth-context';
import { useProject } from '@/hooks/use-projects';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  matchPrefix?: boolean;
}

interface ProjectSidebarProps {
  projectId: string;
}

export function ProjectSidebar({ projectId }: ProjectSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { project } = useProject(user?.token ?? null, projectId);

  const navItems: NavItem[] = [
    {
      label: 'Back to Projects',
      href: `/projects`,
      icon: FolderOpen,
    },
    {
      label: 'AI Pipelines',
      href: `/projects/${projectId}/ai`,
      icon: Cpu,
      matchPrefix: true,
    },
    {
      label: 'Members',
      href: `/projects/${projectId}/members`,
      icon: Users,
    },
    {
      label: 'User Settings',
      href: `/settings`,
      icon: Settings,
      matchPrefix: true,
    },
  ];

  function isActive(item: NavItem) {
    if (item.matchPrefix) return pathname.startsWith(item.href);
    return pathname === item.href;
  }

  function handleLogout() {
    logout();
    router.push('/');
  }

  const initials = user?.userId.slice(0, 2).toUpperCase() ?? 'U';

  return (
    <div className="flex h-full flex-col">
      {/* Logo + workspace switcher */}
      <div className="border-b border-white/[0.07] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors text-left">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-indigo-600">
                <span className="text-[10px] font-bold text-white">U</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold text-[#fafafa]">
                  {project?.name ?? 'Loading…'}
                </p>
                <p className="truncate text-[10px] text-[#71717a]">Project</p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#71717a]" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={() => router.push('/projects')}>
              Switch project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);
            return (
              <li key={item.href}>
                <Link
                  href={item.href as never}
                  className={cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors',
                    active
                      ? 'bg-indigo-600/10 text-indigo-400 font-medium'
                      : 'text-[#a1a1aa] hover:bg-white/[0.04] hover:text-[#fafafa]',
                  )}
                >
                  <Icon
                    className={cn(
                      'h-4 w-4 shrink-0',
                      active ? 'text-indigo-400' : 'text-[#71717a]',
                    )}
                  />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User section */}
      <div className="border-t border-white/[0.07] p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-white/[0.04] transition-colors">
              <Avatar className="h-6 w-6 shrink-0">
                <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate text-left text-sm text-[#a1a1aa]">My account</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="top" className="w-48">
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} destructive>
              <LogOut className="h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
