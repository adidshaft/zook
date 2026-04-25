import type { AuthSessionSummary, Role } from "@zook/core";
import { ApiError } from "@zook/core";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { mobileApiFetch } from "./api";
import { deleteStoredValue, getStoredValue, setStoredValue } from "./storage";

const SESSION_STORAGE_KEY = "zook_session";
const ACTIVE_ORG_STORAGE_KEY = "zook_active_org";
type LogoutCleanup = () => Promise<void> | void;

interface RequestOtpResult {
  challengeId: string;
  expiresAt: string;
  devOtp?: string;
}

interface VerifyOtpResult {
  token: string;
  expiresAt: string;
  session?: AuthSessionSummary;
}

interface AuthContextValue {
  status: "loading" | "authenticated" | "unauthenticated";
  token?: string;
  session?: AuthSessionSummary;
  activeOrgId?: string;
  defaultRoute: string;
  requestOtp: (email: string) => Promise<RequestOtpResult>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setActiveOrgId: (orgId: string) => Promise<void>;
  hasAnyRole: (...roles: Role[]) => boolean;
  registerLogoutCleanup: (cleanup: LogoutCleanup) => () => void;
  error?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function sessionDefaultRoute(session?: AuthSessionSummary) {
  const roles = new Set(session?.organizations.flatMap((organization) => organization.roles) ?? []);
  if (roles.has("TRAINER")) {
    return "/trainer";
  }
  return "/";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [token, setToken] = useState<string | undefined>();
  const [session, setSession] = useState<AuthSessionSummary | undefined>();
  const [activeOrgId, setActiveOrgIdState] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const logoutCleanupsRef = useRef(new Set<LogoutCleanup>());

  const hydrate = useCallback(
    async (tokenValue: string, preferredOrgId?: string) => {
      const currentSession = await mobileApiFetch<AuthSessionSummary>("/auth/me", {
        token: tokenValue,
        ...(preferredOrgId ? { orgId: preferredOrgId } : {})
      });
      const resolvedOrgId = currentSession.activeOrgId ?? preferredOrgId;
      if (resolvedOrgId) {
        await setStoredValue(ACTIVE_ORG_STORAGE_KEY, resolvedOrgId);
      }
      setToken(tokenValue);
      setSession(currentSession);
      setActiveOrgIdState(resolvedOrgId);
      setStatus("authenticated");
      setError(undefined);
    },
    []
  );

  const clearSession = useCallback(async () => {
    await Promise.all([deleteStoredValue(SESSION_STORAGE_KEY), deleteStoredValue(ACTIVE_ORG_STORAGE_KEY)]);
    setToken(undefined);
    setSession(undefined);
    setActiveOrgIdState(undefined);
    setStatus("unauthenticated");
  }, []);

  const refresh = useCallback(async () => {
    setStatus("loading");
    const [storedToken, storedOrgId] = await Promise.all([
      getStoredValue(SESSION_STORAGE_KEY),
      getStoredValue(ACTIVE_ORG_STORAGE_KEY)
    ]);

    if (!storedToken) {
      setStatus("unauthenticated");
      setToken(undefined);
      setSession(undefined);
      setActiveOrgIdState(storedOrgId ?? undefined);
      return;
    }

    try {
      await hydrate(storedToken, storedOrgId ?? undefined);
    } catch {
      await clearSession();
    }
  }, [clearSession, hydrate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requestOtp = useCallback(async (email: string) => {
    const result = await mobileApiFetch<RequestOtpResult>("/auth/request-otp", {
      method: "POST",
      body: { email }
    });
    setError(undefined);
    return result;
  }, []);

  const verifyOtp = useCallback(
    async (email: string, code: string) => {
      const result = await mobileApiFetch<VerifyOtpResult>("/auth/verify-otp", {
        method: "POST",
        body: { email, code }
      });
      await setStoredValue(SESSION_STORAGE_KEY, result.token);
      await hydrate(result.token, activeOrgId);
    },
    [activeOrgId, hydrate]
  );

  const registerLogoutCleanup = useCallback((cleanup: LogoutCleanup) => {
    logoutCleanupsRef.current.add(cleanup);
    return () => {
      logoutCleanupsRef.current.delete(cleanup);
    };
  }, []);

  const logout = useCallback(async () => {
    try {
      for (const cleanup of logoutCleanupsRef.current) {
        try {
          await cleanup();
        } catch {
          // Best-effort cleanup keeps logout resilient when device unregister fails.
        }
      }
      if (token) {
        await mobileApiFetch("/auth/logout", { method: "POST", token });
      }
    } finally {
      await clearSession();
    }
  }, [clearSession, token]);

  const setActiveOrgId = useCallback(
    async (orgId: string) => {
      if (!token) {
        return;
      }
      await setStoredValue(ACTIVE_ORG_STORAGE_KEY, orgId);
      await hydrate(token, orgId);
    },
    [hydrate, token]
  );

  const hasAnyRole = useCallback(
    (...roles: Role[]) =>
      Boolean(
        session?.organizations.some((organization) => organization.roles.some((role) => roles.includes(role)))
      ),
    [session]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      token,
      session,
      activeOrgId,
      defaultRoute: sessionDefaultRoute(session),
      requestOtp,
      verifyOtp,
      logout,
      refresh,
      setActiveOrgId,
      hasAnyRole,
      registerLogoutCleanup,
      error
    }),
    [
      activeOrgId,
      error,
      hasAnyRole,
      logout,
      refresh,
      registerLogoutCleanup,
      requestOtp,
      session,
      setActiveOrgId,
      status,
      token,
      verifyOtp
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Something went wrong.";
}
