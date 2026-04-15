import { redirect } from 'next/navigation';

export default function WorkspaceDetailRedirect() {
  redirect('/projects');
}
