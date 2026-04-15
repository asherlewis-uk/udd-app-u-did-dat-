'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { toast } from '@/hooks/use-toast';

function AuthCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { exchangeCode } = useAuth();
  const didExchange = React.useRef(false);

  React.useEffect(() => {
    if (didExchange.current) return;
    didExchange.current = true;

    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      toast({
        title: 'Authentication error',
        description: errorDescription ?? error,
        variant: 'error',
      });
      router.replace('/');
      return;
    }

    if (!code || !state) {
      toast({
        title: 'Invalid callback',
        description: 'Missing authorization code or state. Please try again.',
        variant: 'error',
      });
      router.replace('/');
      return;
    }

    exchangeCode(code, state)
      .then(() => {
        router.replace('/projects');
      })
      .catch((err: unknown) => {
        toast({
          title: 'Sign-in failed',
          description: err instanceof Error ? err.message : 'Authentication failed',
          variant: 'error',
        });
        router.replace('/');
      });
  }, [exchangeCode, router, searchParams]);

  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#09090b]">
      <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      <p className="text-sm text-[#a1a1aa]">Completing sign-in…</p>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <React.Suspense
      fallback={
        <div className="flex h-screen flex-col items-center justify-center gap-4 bg-[#09090b]">
          <div className="h-6 w-6 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
          <p className="text-sm text-[#a1a1aa]">Completing sign-in…</p>
        </div>
      }
    >
      <AuthCallbackInner />
    </React.Suspense>
  );
}
