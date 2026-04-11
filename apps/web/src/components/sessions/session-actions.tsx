'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { apiClient } from '@/lib/api-client';

interface SessionActionsProps {
  projectId: string;
  onRefresh(): void;
}

export function SessionActions({ projectId, onRefresh }: SessionActionsProps) {
  const [isCreating, setIsCreating] = React.useState(false);

  async function handleNewSession() {
    setIsCreating(true);
    try {
      const created = await apiClient.createSession(projectId);
      await apiClient.startSession(created.data.id);
      onRefresh();
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <Button
      variant="primary"
      size="sm"
      loading={isCreating}
      onClick={handleNewSession}
    >
      <Plus className="h-3.5 w-3.5" />
      New Session
    </Button>
  );
}
