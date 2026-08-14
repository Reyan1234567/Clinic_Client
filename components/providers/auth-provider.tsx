"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import * as authApi from "@/lib/api/auth";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/client";
import { ApiError, type AuthUser } from "@/lib/types";

interface AuthContextValue {
  user: AuthUser | null;
  /** True until the initial /me rehydration settles. */
  loading: boolean;
  /** Set when /me answered but omitted `permissions`. */
  permissionsMissing: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionsMissing, setPermissionsMissing] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const adopt = useCallback((next: AuthUser) => {
    // The whole UI is assembled from this array. If the server ever stops
    // sending it, fail loudly instead of falling back to roles.
    setPermissionsMissing(!Array.isArray(next.permissions));
    setUser(next);
  }, []);

  useEffect(() => {
    let active = true;

    authApi
      .getMe()
      .then((me) => {
        if (active) adopt(me);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [adopt]);

  useEffect(() => {
    const onExpired = () => {
      setUser(null);
      queryClient.clear();
      router.replace("/login");
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [queryClient, router]);

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await authApi.login({ username, password });
      adopt(result.user);
      router.replace("/dashboard");
    },
    [adopt, router],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // The cookies are gone either way; still drop the local session.
    }
    setUser(null);
    queryClient.clear();
    router.replace("/login");
  }, [queryClient, router]);

  const value = useMemo(
    () => ({ user, loading, permissionsMissing, login, logout }),
    [user, loading, permissionsMissing, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "Something went wrong";
}
