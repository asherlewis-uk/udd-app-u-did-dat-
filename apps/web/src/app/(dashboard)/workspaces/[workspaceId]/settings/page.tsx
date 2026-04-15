import { redirect } from 'next/navigation';

export default function LegacyWorkspaceSettingsPage() {
  redirect('/settings/providers');
}
