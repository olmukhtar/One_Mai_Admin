import { create } from "zustand";

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

interface AuthStore {
  token: string | null;
  role: UserRole | null;
  user: AuthSession["user"] | null;
  adminId: string | null;
  isAuthenticated: boolean;
  login: (sessionData: AuthSession, rememberMe?: boolean) => void;
  logout: () => void;
}

const getInitialSession = (): AuthSession | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY) || sessionStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
};

const initialSession = getInitialSession();
const token = initialSession?.token || null;
const rawRole = (initialSession?.role || initialSession?.user?.role || null) as UserRole | null;
const user = initialSession?.user || null;
const adminId = user?.id || user?._id || null;

export const useAuthStore = create<AuthStore>((set) => ({
  token,
  role: rawRole,
  user,
  adminId,
  isAuthenticated: !!token,
  login: (sessionData, rememberMe = true) => {
    const targetStorage = rememberMe ? localStorage : sessionStorage;
    targetStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(sessionData));

    const token = sessionData.token;
    const rawRole = (sessionData.role || sessionData.user?.role || null) as UserRole | null;
    const user = sessionData.user || null;
    const adminId = user?.id || user?._id || null;

    set({
      token,
      role: rawRole,
      user,
      adminId,
      isAuthenticated: !!token,
    });
  },
  logout: () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    sessionStorage.removeItem(AUTH_STORAGE_KEY);
    set({
      token: null,
      role: null,
      user: null,
      adminId: null,
      isAuthenticated: false,
    });
  },
}));

export function useAuth() {
  return useAuthStore();
}
