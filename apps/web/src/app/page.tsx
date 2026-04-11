'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';

export default function LoginPage() {
  const { isAuthenticated, isLoading, pkceInit } = useAuth();
  const router = useRouter();
  const [isPending, setIsPending] = React.useState(false);

  // Redirect if already authenticated
  React.useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace('/workspaces');
    }
  }, [isAuthenticated, isLoading, router]);

  async function handleSignIn() {
    setIsPending(true);
    try {
      const { state, codeChallenge } = await pkceInit();

      // Build WorkOS authorization URL
      const params = new URLSearchParams({
        client_id: process.env['NEXT_PUBLIC_WORKOS_CLIENT_ID'] ?? '',
        redirect_uri: `${window.location.origin}/auth/callback`,
        response_type: 'code',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
      });
      const authUrl = `https://api.workos.com/user_management/authorize?${params}`;
      window.location.href = authUrl;
    } catch (err) {
      toast({
        title: 'Sign-in failed',
        description: err instanceof Error ? err.message : 'Could not initiate sign-in',
        variant: 'error',
      });
      setIsPending(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#09090b]">
        <div className="h-5 w-5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#09090b] p-4">
      {/* Background grid pattern */}
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            'linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* Glow */}
      <div className="pointer-events-none fixed inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[600px] rounded-full bg-indigo-500/5 blur-3xl" />
      </div>

      {/* Login card */}
      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="mb-10 flex flex-col items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/30">
            <span className="font-mono text-lg font-bold text-white">U</span>
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold text-[#fafafa]">UDD Platform</h1>
            <p className="mt-1 text-sm text-[#a1a1aa]">
              Cloud IDE &amp; AI pipeline execution
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/[0.07] bg-[#18181b] p-8 shadow-2xl">
          <h2 className="mb-1 text-base font-semibold text-[#fafafa]">Welcome back</h2>
          <p className="mb-6 text-sm text-[#a1a1aa]">
            Sign in to access your workspaces and projects.
          </p>

          <Button
            variant="primary"
            size="lg"
            className="w-full"
            loading={isPending}
            onClick={handleSignIn}
          >
            Continue with WorkOS
          </Button>

          <p className="mt-6 text-center text-xs text-[#71717a]">
            By continuing, you agree to our{' '}
            <a href="#" className="underline hover:text-[#a1a1aa] transition-colors">
              Terms of Service
            </a>{' '}
            and{' '}
            <a href="#" className="underline hover:text-[#a1a1aa] transition-colors">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
