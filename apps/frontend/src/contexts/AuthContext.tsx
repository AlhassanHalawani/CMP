import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import keycloak from '@/config/keycloak';

interface User {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

interface AuthContextValue {
  initialized: boolean;
  authenticated: boolean;
  user: User | null;
  token: string | null;
  login: () => void;
  logout: () => void;
  register: (loginHint?: string) => void;
  hasRole: (role: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function extractRoles(tokenParsed: any): string[] {
  const realmRoles = tokenParsed?.realm_access?.roles ?? [];
  const resourceAccess = tokenParsed?.resource_access ?? {};
  const clientRoles = Object.values(resourceAccess)
    .flatMap((client: any) => client?.roles ?? []);

  return Array.from(new Set([...realmRoles, ...clientRoles]));
}

function userFromKeycloak(): User {
  return {
    id: keycloak.subject || '',
    name: (keycloak.tokenParsed as any)?.name || '',
    email: (keycloak.tokenParsed as any)?.email || '',
    roles: extractRoles(keycloak.tokenParsed),
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // DB role is fetched from /api/users/me and used as the authoritative source
  // for permission checks, overriding potentially stale Keycloak token roles.
  const [dbRole, setDbRole] = useState<string | null>(null);

  const fetchDbRole = useCallback(async () => {
    if (!keycloak.token) return;
    try {
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${keycloak.token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setDbRole(data.role ?? null);
      }
    } catch {
      // non-fatal — token roles remain the fallback
    }
  }, []);

  useEffect(() => {
    keycloak.onAuthSuccess = () => {
      setAuthenticated(true);
      setToken(keycloak.token || null);
      setUser(userFromKeycloak());
      setInitialized(true);
      fetchDbRole();
    };

    keycloak.onAuthLogout = () => {
      setAuthenticated(false);
      setUser(null);
      setToken(null);
      setDbRole(null);
    };

    keycloak.onTokenExpired = () => {
      keycloak.updateToken(30).catch(() => {
        setAuthenticated(false);
        setUser(null);
        setToken(null);
        setDbRole(null);
      });
    };

    keycloak.onAuthRefreshSuccess = () => {
      setToken(keycloak.token || null);
      setUser(userFromKeycloak());
      fetchDbRole();
    };

    keycloak.onAuthRefreshError = () => {
      setAuthenticated(false);
      setUser(null);
      setToken(null);
      setDbRole(null);
    };

    keycloak
      .init({
        onLoad: 'check-sso',
        silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
        pkceMethod: 'S256',
      })
      .then((auth) => {
        setAuthenticated(auth);
        setInitialized(true);
        if (auth) {
          setToken(keycloak.token || null);
          setUser(userFromKeycloak());
          fetchDbRole();
        }
      })
      .catch(() => {
        setInitialized(true);
      });

    // Proactive token refresh every 30 s
    const interval = setInterval(() => {
      if (keycloak.authenticated) {
        keycloak.updateToken(30).then((refreshed) => {
          if (refreshed) {
            setToken(keycloak.token || null);
            setUser(userFromKeycloak());
          }
          // Always re-check DB role on the interval so role changes surface
          // within ~30 s even if the token didn't refresh.
          fetchDbRole();
        }).catch(() => {
          setAuthenticated(false);
          setUser(null);
          setToken(null);
          setDbRole(null);
        });
      }
    }, 30000);

    // Refresh token and DB role when the tab regains focus
    const handleFocus = () => {
      if (keycloak.authenticated) {
        keycloak.updateToken(-1).then((refreshed) => {
          if (refreshed) {
            setToken(keycloak.token || null);
            setUser(userFromKeycloak());
          }
          fetchDbRole();
        }).catch(() => {
          // Session expired while tab was hidden
        });
      }
    };

    window.addEventListener('focus', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchDbRole]);

  const login = () => keycloak.login();
  const logout = () => keycloak.logout({ redirectUri: window.location.origin });
  const register = (loginHint?: string) =>
    keycloak.register(loginHint ? { loginHint } : undefined);

  // Prefer the DB role (authoritative) over stale token roles.
  const hasRole = (role: string): boolean => {
    if (dbRole !== null) return dbRole === role;
    return user?.roles.includes(role) ?? false;
  };

  return (
    <AuthContext.Provider value={{ initialized, authenticated, user, token, login, logout, register, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
