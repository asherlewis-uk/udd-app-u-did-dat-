'use client';

import * as React from 'react';
import type { Workspace } from '@udd/contracts';

interface WorkspaceContextValue {
  activeWorkspaceId: string | null;
  activeWorkspace: Workspace | null;
  setActiveWorkspace(workspace: Workspace | null): void;
}

const WorkspaceContext = React.createContext<WorkspaceContextValue>({
  activeWorkspaceId: null,
  activeWorkspace: null,
  setActiveWorkspace: () => undefined,
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkspace, setActiveWorkspace] = React.useState<Workspace | null>(null);
  return (
    <WorkspaceContext.Provider
      value={{
        activeWorkspaceId: activeWorkspace?.id ?? null,
        activeWorkspace,
        setActiveWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextValue {
  return React.useContext(WorkspaceContext);
}
