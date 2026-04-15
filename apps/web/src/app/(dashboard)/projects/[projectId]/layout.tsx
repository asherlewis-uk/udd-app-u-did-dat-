import { AppShell } from '@/components/layout/app-shell';
import { ProjectSidebar } from '@/components/layout/project-sidebar';

interface Props {
  children: React.ReactNode;
  params: { projectId: string };
}

export default function ProjectLayout({ children, params }: Props) {
  return (
    <AppShell sidebar={<ProjectSidebar projectId={params.projectId} />}>
      {children}
    </AppShell>
  );
}
