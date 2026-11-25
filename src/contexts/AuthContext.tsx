import React, { createContext, useContext, useMemo, useState } from "react";

export const AUTH_STORAGE_KEY = "admin_auth";

export type UserRole =
  | "admin"
  | "account"
  | "front_desk"
  | "marketing"
  | "customer_support"
  | "affiliate";

export interface AuthSession {
  token: string;
  role: UserRole;
  user?: {
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
  };
}

interface AuthContextValue {
  token: string | null;
  role: UserRole | null;
  user: AuthSession["user"] | null;
  adminId: string | null;
  isAuthenticated: boolean;
  login: (sessionData: AuthSession, rememberMe?: boolean) => void;
  logout: () => void;
}

function getInitialSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

function deriveAuthState(session: AuthSession | null) {
  const token = session?.token || null;
  const role = (session?.role || session?.user?.role || null) as UserRole | null;
  const user = session?.user || null;
  const adminId = user?.id || user?._id || null;

  return {
    token,
    role,
    user,
    adminId,
    isAuthenticated: Boolean(token),
  };
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getInitialSession());

  const value = useMemo<AuthContextValue>(() => {
    const authState = deriveAuthState(session);

    return {
      ...authState,
      login: (sessionData, rememberMe = true) => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);

        const targetStorage = rememberMe ? localStorage : sessionStorage;
        targetStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));
        setSession(sessionData);
      },
      logout: () => {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        setSession(null);
      },
    };
  }, [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
