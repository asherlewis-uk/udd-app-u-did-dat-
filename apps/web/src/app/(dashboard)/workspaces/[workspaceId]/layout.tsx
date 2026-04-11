import { AppShell } from '@/components/layout/app-shell';
import { WorkspaceSidebar } from '@/components/layout/workspace-sidebar';

interface Props {
  children: React.ReactNode;
  params: { workspaceId: string };
}

export default function WorkspaceLayout({ children, params }: Props) {
  return (
    <AppShell sidebar={<WorkspaceSidebar workspaceId={params.workspaceId} />}>
      {children}
    </AppShell>
  );
}
