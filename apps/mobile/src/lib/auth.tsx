import type { AuthSessionSummary, Role } from "@zook/core";
import { ApiError } from "@zook/core";
import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { mobileApiFetch } from "./api";
import { DEMO_AUTH_TOKEN, getOfflineDemoRoleOverride, isOfflineDemoMode } from "./demo-mode";
import { deleteStoredValue, getStoredValue, setStoredValue } from "./storage";

const SESSION_STORAGE_KEY = "zook_session";
const ACTIVE_ORG_STORAGE_KEY = "zook_active_org";
const ACTIVE_ROLE_STORAGE_KEY = "zook_active_role";
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
  activeRole?: Role;
  defaultRoute: string;
  requestOtp: (email: string) => Promise<RequestOtpResult>;
  verifyOtp: (email: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  setActiveOrgId: (orgId: string) => Promise<void>;
  setActiveRole: (role: Role) => Promise<void>;
  hasAnyRole: (...roles: Role[]) => boolean;
  hasActiveRole: (...roles: Role[]) => boolean;
  registerLogoutCleanup: (cleanup: LogoutCleanup) => () => void;
  error?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function sessionDefaultRole(session?: AuthSessionSummary): Role | undefined {
  const roles = new Set(session?.activeOrganization?.roles ?? session?.organizations[0]?.roles ?? []);
  if (roles.has("MEMBER")) return "MEMBER";
  if (roles.has("TRAINER")) return "TRAINER";
  if (roles.has("RECEPTIONIST")) return "RECEPTIONIST";
  if (roles.has("OWNER")) return "OWNER";
  if (roles.has("ADMIN")) return "ADMIN";
  if (roles.has("PLATFORM_ADMIN")) return "PLATFORM_ADMIN";
  return undefined;
}

function sessionDefaultRoute(role?: Role) {
  if (role === "TRAINER") {
    return "/trainer";
  }
  if (role === "RECEPTIONIST") {
    return "/reception";
  }
  if (role === "OWNER" || role === "ADMIN") {
    return "/owner";
  }
  return "/";
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [token, setToken] = useState<string | undefined>();
  const [session, setSession] = useState<AuthSessionSummary | undefined>();
  const [activeOrgId, setActiveOrgIdState] = useState<string | undefined>();
  const [activeRole, setActiveRoleState] = useState<Role | undefined>();
  const [error, setError] = useState<string | undefined>();
  const logoutCleanupsRef = useRef(new Set<LogoutCleanup>());

  const hydrate = useCallback(
    async (tokenValue: string, preferredOrgId?: string, preferredRole?: Role) => {
      const currentSession = await mobileApiFetch<AuthSessionSummary>("/auth/me", {
        token: tokenValue,
        ...(preferredOrgId ? { orgId: preferredOrgId } : {})
      });
      const resolvedOrgId = currentSession.activeOrgId ?? preferredOrgId;
      if (resolvedOrgId) {
        await setStoredValue(ACTIVE_ORG_STORAGE_KEY, resolvedOrgId);
      }
      const availableRoles = new Set(
        (currentSession.activeOrganization?.roles ??
          currentSession.organizations.find((organization) => organization.orgId === resolvedOrgId)?.roles ??
          currentSession.organizations[0]?.roles ??
          [])
      );
      const resolvedRole =
        preferredRole && availableRoles.has(preferredRole)
          ? preferredRole
          : sessionDefaultRole(currentSession);
      if (resolvedRole) {
        await setStoredValue(ACTIVE_ROLE_STORAGE_KEY, resolvedRole);
      }
      setToken(tokenValue);
      setSession(currentSession);
      setActiveOrgIdState(resolvedOrgId);
      setActiveRoleState(resolvedRole);
      setStatus("authenticated");
      setError(undefined);
    },
    []
  );

  const clearSession = useCallback(async () => {
    await Promise.all([
      deleteStoredValue(SESSION_STORAGE_KEY),
      deleteStoredValue(ACTIVE_ORG_STORAGE_KEY),
      deleteStoredValue(ACTIVE_ROLE_STORAGE_KEY)
    ]);
    setToken(undefined);
    setSession(undefined);
    setActiveOrgIdState(undefined);
    setActiveRoleState(undefined);
    setStatus("unauthenticated");
  }, []);

  const refresh = useCallback(async () => {
    setStatus("loading");
    if (isOfflineDemoMode()) {
      const [storedOrgId, storedRole] = await Promise.all([
        getStoredValue(ACTIVE_ORG_STORAGE_KEY),
        getStoredValue(ACTIVE_ROLE_STORAGE_KEY)
      ]);
      await hydrate(
        DEMO_AUTH_TOKEN,
        storedOrgId ?? undefined,
        getOfflineDemoRoleOverride() ?? (storedRole as Role | null) ?? undefined,
      );
      return;
    }

    const [storedToken, storedOrgId, storedRole] = await Promise.all([
      getStoredValue(SESSION_STORAGE_KEY),
      getStoredValue(ACTIVE_ORG_STORAGE_KEY),
      getStoredValue(ACTIVE_ROLE_STORAGE_KEY)
    ]);

    if (!storedToken) {
      setStatus("unauthenticated");
      setToken(undefined);
      setSession(undefined);
      setActiveOrgIdState(storedOrgId ?? undefined);
      setActiveRoleState((storedRole as Role | null) ?? undefined);
      return;
    }

    try {
      await hydrate(storedToken, storedOrgId ?? undefined, (storedRole as Role | null) ?? undefined);
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
      await hydrate(result.token, activeOrgId, activeRole);
    },
    [activeOrgId, activeRole, hydrate]
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
      if (isOfflineDemoMode()) {
        await hydrate(DEMO_AUTH_TOKEN);
      } else {
        await clearSession();
      }
    }
  }, [clearSession, hydrate, token]);

  const setActiveOrgId = useCallback(
    async (orgId: string) => {
      if (!token) {
        return;
      }
      await setStoredValue(ACTIVE_ORG_STORAGE_KEY, orgId);
      await hydrate(token, orgId, activeRole);
    },
    [activeRole, hydrate, token]
  );

  const setActiveRole = useCallback(
    async (role: Role) => {
      await setStoredValue(ACTIVE_ROLE_STORAGE_KEY, role);
      setActiveRoleState(role);
    },
    []
  );

  const hasAnyRole = useCallback(
    (...roles: Role[]) =>
      Boolean(
        session?.organizations.some((organization) => organization.roles.some((role) => roles.includes(role)))
      ),
    [session]
  );

  const hasActiveRole = useCallback(
    (...roles: Role[]) => Boolean(activeRole && roles.includes(activeRole)),
    [activeRole]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      token,
      session,
      activeOrgId,
      activeRole,
      defaultRoute: sessionDefaultRoute(activeRole ?? sessionDefaultRole(session)),
      requestOtp,
      verifyOtp,
      logout,
      refresh,
      setActiveOrgId,
      setActiveRole,
      hasAnyRole,
      hasActiveRole,
      registerLogoutCleanup,
      error
    }),
    [
      activeOrgId,
      activeRole,
      error,
      hasActiveRole,
      hasAnyRole,
      logout,
      refresh,
      registerLogoutCleanup,
      requestOtp,
      session,
      setActiveOrgId,
      setActiveRole,
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
