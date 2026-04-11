'use client';

import { useState, useCallback, useEffect } from 'react';

const TOKEN_KEY = 'udd_session_token';

interface AuthState {
  token: string | null;
  userId: string | null;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>(() => {
    if (typeof window === 'undefined') {
      return { token: null, userId: null, isAuthenticated: false };
    }
    const token = sessionStorage.getItem(TOKEN_KEY);
    return { token, userId: null, isAuthenticated: !!token };
  });

  const login = useCallback(async (code: string): Promise<void> => {
    const apiBase = process.env['NEXT_PUBLIC_API_URL'] ?? '/v1';
    const res = await fetch(`${apiBase}/auth/session/exchange`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(err.message ?? 'Authentication failed');
    }

    const data = (await res.json()) as { data: { token: string; userId: string } };
    const { token, userId } = data.data;

    sessionStorage.setItem(TOKEN_KEY, token);
    setState({ token, userId, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    setState({ token: null, userId: null, isAuthenticated: false });
  }, []);

  return { ...state, login, logout };
}
