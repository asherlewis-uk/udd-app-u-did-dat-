import { redirect } from 'next/navigation';

export default function LegacyWorkspaceProjectEditorPage({
  params,
}: {
  params: { projectId: string };
}) {
  redirect(`/projects/${params.projectId}/editor`);
}