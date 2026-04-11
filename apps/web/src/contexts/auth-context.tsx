'use client';

import * as React from 'react';
import { apiClient } from '@/lib/api-client';

const TOKEN_KEY = 'udd_session_token';
const USER_ID_KEY = 'udd_user_id';

export interface AuthUser {
  userId: string;
  token: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  pkceInit(): Promise<{ state: string; codeChallenge: string }>;
  exchangeCode(code: string, state: string): Promise<void>;
  logout(): void;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Rehydrate from sessionStorage on mount
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = sessionStorage.getItem(TOKEN_KEY);
      const userId = sessionStorage.getItem(USER_ID_KEY);
      if (token && userId) {
        apiClient.setSessionToken(token);
        setUser({ token, userId });
      }
    }
    setIsLoading(false);
  }, []);

  const pkceInit = React.useCallback(async () => {
    const res = await apiClient.pkceInit();
    return { state: res.data.state, codeChallenge: res.data.codeChallenge };
  }, []);

  const exchangeCode = React.useCallback(async (code: string, state: string) => {
    const res = await apiClient.exchangeCode(code, state);
    const { token, userId } = res.data;
    sessionStorage.setItem(TOKEN_KEY, token);
    sessionStorage.setItem(USER_ID_KEY, userId);
    apiClient.setSessionToken(token);
    setUser({ token, userId });
  }, []);

  const logout = React.useCallback(() => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_ID_KEY);
    apiClient.setSessionToken('');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        pkceInit,
        exchangeCode,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
