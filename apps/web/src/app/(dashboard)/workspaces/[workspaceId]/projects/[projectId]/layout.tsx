import { redirect } from 'next/navigation';

export default function LegacyProjectRedirect({ params }: { params: { projectId: string } }) {
  redirect(`/projects/${params.projectId}`);
}
