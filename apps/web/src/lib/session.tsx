import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiRequest, setCsrfToken, type SessionResponse } from './api';

type User = NonNullable<SessionResponse['user']>;
type Preferences = NonNullable<SessionResponse['preferences']>;

interface AuthState {
  user: User | null;
  preferences: Preferences | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setSession: (user: User, preferences: Preferences, csrfToken: string | null) => void;
  updatePreferences: (patch: Partial<Preferences>) => Promise<Preferences>;
  updateProfile: (patch: { displayName?: string; phone?: string | null }) => Promise<User>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiRequest<SessionResponse>('/api/auth/session');
      setCsrfToken(data.csrfToken);
      setUser(data.user);
      setPreferences(data.preferences);
    } catch {
      setUser(null);
      setPreferences(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiRequest<SessionResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setCsrfToken(data.csrfToken);
    setUser(data.user);
    setPreferences(data.preferences);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } finally {
      setCsrfToken(null);
      setUser(null);
      setPreferences(null);
    }
  }, []);

  const setSession = useCallback(
    (nextUser: User, nextPreferences: Preferences, token: string | null) => {
      setCsrfToken(token);
      setUser(nextUser);
      setPreferences(nextPreferences);
    },
    [],
  );

  const updatePreferences = useCallback(async (patch: Partial<Preferences>) => {
    const data = await apiRequest<{ preferences: Preferences }>('/api/me/preferences', {
      method: 'PATCH',
      body: patch,
    });
    setPreferences(data.preferences);
    return data.preferences;
  }, []);

  const updateProfile = useCallback(
    async (patch: { displayName?: string; phone?: string | null }) => {
      const data = await apiRequest<{ user: User; preferences: Preferences }>('/api/me', {
        method: 'PATCH',
        body: patch,
      });
      setUser(data.user);
      return data.user;
    },
    [],
  );

  const value = useMemo<AuthState>(
    () => ({
      user,
      preferences,
      loading,
      refresh,
      login,
      logout,
      setSession,
      updatePreferences,
      updateProfile,
    }),
    [user, preferences, loading, refresh, login, logout, setSession, updatePreferences, updateProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
