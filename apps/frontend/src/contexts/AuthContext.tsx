import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [initialized, setInitialized] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    keycloak
      .init({ onLoad: 'check-sso', silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html` })
      .then((auth) => {
        setAuthenticated(auth);
        setInitialized(true);
        if (auth) {
          setToken(keycloak.token || null);
          setUser({
            id: keycloak.subject || '',
            name: (keycloak.tokenParsed as any)?.name || '',
            email: (keycloak.tokenParsed as any)?.email || '',
            roles: extractRoles(keycloak.tokenParsed),
          });
        }
      })
      .catch(() => {
        setInitialized(true);
      });

    // Token refresh
    const interval = setInterval(() => {
      if (keycloak.authenticated) {
        keycloak.updateToken(30).then((refreshed) => {
          if (refreshed) setToken(keycloak.token || null);
        });
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const login = () => keycloak.login();
  const logout = () => keycloak.logout({ redirectUri: window.location.origin });
  const register = (loginHint?: string) =>
    keycloak.register(loginHint ? { loginHint } : undefined);
  const hasRole = (role: string) => user?.roles.includes(role) ?? false;

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
