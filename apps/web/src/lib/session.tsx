import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

  const revision = useRef(0);
  const changingSession = useRef(false);
  const lastRefresh = useRef(0);
  const announce = () => { try { localStorage.setItem('dealmosaic:session-change', String(Date.now())); } catch { /* Storage may be blocked; focus refresh still works. */ } };

  const refresh = useCallback(async () => {
    if (changingSession.current) return;
    const requestRevision = ++revision.current;
    lastRefresh.current = Date.now();
    try {
      const data = await apiRequest<SessionResponse>('/api/auth/session');
      if (requestRevision !== revision.current) return;
      setCsrfToken(data.csrfToken);
      setUser(data.user);
      setPreferences(data.preferences);
    } catch {
      // A transient network failure is not proof that the user signed out.
      // The API still checks every privileged request independently.
    } finally {
      if (requestRevision === revision.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const resume = () => { if (document.visibilityState === 'visible' && Date.now() - lastRefresh.current > 30_000) void refresh(); };
    const changed = (event: StorageEvent) => { if (event.key === 'dealmosaic:session-change') void refresh(); };
    const restored = (event: PageTransitionEvent) => { if (event.persisted) void refresh(); };
    window.addEventListener('focus', resume);
    document.addEventListener('visibilitychange', resume);
    window.addEventListener('storage', changed);
    window.addEventListener('pageshow', restored);
    return () => {
      window.removeEventListener('focus', resume);
      document.removeEventListener('visibilitychange', resume);
      window.removeEventListener('storage', changed);
      window.removeEventListener('pageshow', restored);
    };
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    changingSession.current = true;
    const requestRevision = ++revision.current;
    try {
      const data = await apiRequest<SessionResponse>('/api/auth/login', {
        method: 'POST', body: { email, password },
      });
      if (requestRevision !== revision.current) return;
      setCsrfToken(data.csrfToken);
      setUser(data.user);
      setPreferences(data.preferences);
      announce();
    } finally {
      changingSession.current = false;
      if (requestRevision === revision.current) setLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    changingSession.current = true;
    const requestRevision = ++revision.current;
    try {
      // Do not claim sign-out if the server could not revoke the cookie.
      await apiRequest('/api/auth/logout', { method: 'POST' });
      if (requestRevision !== revision.current) return;
      setCsrfToken(null); setUser(null); setPreferences(null); announce();
    } finally {
      changingSession.current = false;
      if (requestRevision === revision.current) setLoading(false);
    }
  }, []);

  const setSession = useCallback(
    (nextUser: User, nextPreferences: Preferences, token: string | null) => {
      ++revision.current;
      setLoading(false);
      announce();
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
