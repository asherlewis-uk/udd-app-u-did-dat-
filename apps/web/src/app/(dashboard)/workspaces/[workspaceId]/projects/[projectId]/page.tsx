import { redirect } from 'next/navigation';

export default function LegacyWorkspaceProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  redirect(`/projects/${params.projectId}`);
}