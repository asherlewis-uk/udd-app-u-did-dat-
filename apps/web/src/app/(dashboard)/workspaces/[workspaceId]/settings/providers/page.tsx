import { redirect } from 'next/navigation';

export default function LegacyWorkspaceProvidersPage() {
  redirect('/settings/providers');
}
