import { ApiError } from "@zook/core/api";
import { isOrgRole } from "@zook/core/permissions";
import type { AuthSessionSummary, Permission, Role } from "@zook/core/types";
import type { QueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as LocalAuthentication from "expo-local-authentication";
import { Alert, AppState } from "react-native";
import { authClient } from "./domain-api";
import { DEMO_AUTH_TOKEN, isOfflineDemoMode } from "./demo-mode";
import { applySessionLocalePreference } from "./i18n";
import { deleteStoredValue, getStoredValue, setStoredValue } from "./storage";

const SESSION_STORAGE_KEY = "zook_session";
const SESSION_EXPIRES_AT_STORAGE_KEY = "zook_session_expires_at";
const BIOMETRIC_ENABLED_STORAGE_KEY = "zook_biometric_enabled";
const BIOMETRIC_PROMPTED_STORAGE_KEY = "zook_biometric_prompted";
const ACTIVE_ORG_STORAGE_KEY = "zook_active_org";
const ACTIVE_ROLE_STORAGE_KEY = "zook_active_role";
const OFFLINE_DEMO_LOGGED_OUT_STORAGE_KEY = "zook_offline_demo_logged_out";
const SESSION_FALLBACK_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_PROACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;
const ORG_ROLE_PRIORITY: Role[] = ["OWNER", "ADMIN", "RECEPTIONIST", "TRAINER", "MEMBER"];
type LogoutCleanup = () => Promise<void> | void;
let authQueryClient: QueryClient | undefined;

export function setAuthQueryClient(queryClient: QueryClient) {
  authQueryClient = queryClient;
  return () => {
    if (authQueryClient === queryClient) {
      authQueryClient = undefined;
    }
  };
}

function sanitizeOtpCode(value: string) {
  return value
    .normalize("NFKC")
    .replace(/[^0-9]/g, "")
    .slice(0, 6);
}

interface RequestOtpResult {
  challengeId: string;
  expiresAt: string;
  devOtp?: string;
}

interface AuthContextValue {
  status: "loading" | "authenticated" | "unauthenticated";
  token?: string;
  session?: AuthSessionSummary;
  activeOrgId?: string;
  activeRole?: Role;
  defaultRoute: string;
  offlineMode: boolean;
  offlineBanner?: string;
  proactiveLogin?: { identifier?: string; triggeredAt: number };
  biometricEnabled: boolean;
  requestOtp: (identifier: string) => Promise<RequestOtpResult>;
  signInWithApple: (identityToken: string, fullName?: string) => Promise<void>;
  signInWithGoogle: (idToken: string) => Promise<void>;
  verifyOtp: (identifier: string, code: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  clearExpiredSession: () => Promise<void>;
  setActiveOrgId: (orgId: string) => Promise<void>;
  setActiveRole: (role: Role) => Promise<void>;
  setBiometricEnabled: (enabled: boolean) => Promise<boolean>;
  hasAnyRole: (...roles: Role[]) => boolean;
  hasActiveRole: (...roles: Role[]) => boolean;
  registerLogoutCleanup: (cleanup: LogoutCleanup) => () => void;
  error?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function sessionDefaultRole(session?: AuthSessionSummary): Role | undefined {
  return defaultRoleForOrg(
    (session?.activeOrganization?.roles ?? session?.organizations[0]?.roles ?? []).filter(
      isOrgRole,
    ),
  );
}

function defaultRoleForOrg(roles: Role[]): Role | undefined {
  return ORG_ROLE_PRIORITY.find((role) => roles.includes(role)) ?? roles[0];
}

async function invalidateRoleScopedQueries() {
  if (!authQueryClient) {
    return;
  }
  await Promise.all([
    authQueryClient.invalidateQueries({ queryKey: ["org"] }),
    authQueryClient.invalidateQueries({ queryKey: ["me"] }),
    authQueryClient.invalidateQueries({ queryKey: ["auth", "me"] }),
  ]);
}

async function invalidateAllQueries() {
  await authQueryClient?.invalidateQueries();
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

function defaultRouteForSession(session?: AuthSessionSummary, role?: Role) {
  if (role) {
    return sessionDefaultRoute(role);
  }
  if (session?.user.isPlatformAdmin && !session.organizations.length) {
    return "/platform";
  }
  return sessionDefaultRoute(sessionDefaultRole(session));
}

function fallbackSessionExpiresAt() {
  return new Date(Date.now() + SESSION_FALLBACK_MS).toISOString();
}

function normalizeSessionExpiresAt(value?: string | null) {
  const expiresAt = value ? new Date(value).getTime() : Number.NaN;
  if (Number.isFinite(expiresAt) && expiresAt > Date.now()) {
    return new Date(expiresAt).toISOString();
  }
  return fallbackSessionExpiresAt();
}

async function biometricAvailable() {
  if (isOfflineDemoMode()) return false;
  const [hasHardware, enrolled] = await Promise.all([
    LocalAuthentication.hasHardwareAsync(),
    LocalAuthentication.isEnrolledAsync(),
  ]);
  return hasHardware && enrolled;
}

async function authenticateBiometric() {
  if (!(await biometricAvailable())) {
    return false;
  }
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: "Unlock Zook",
    cancelLabel: "Use OTP",
    disableDeviceFallback: false,
  });
  return result.success;
}

export async function getBiometricUnlockEnabled() {
  return (await getStoredValue(BIOMETRIC_ENABLED_STORAGE_KEY)) === "1";
}

export async function setStoredBiometricUnlockEnabled(enabled: boolean) {
  if (enabled && !(await biometricAvailable())) {
    return false;
  }
  await setStoredValue(BIOMETRIC_ENABLED_STORAGE_KEY, enabled ? "1" : "0");
  return true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");
  const [token, setToken] = useState<string | undefined>();
  const [session, setSession] = useState<AuthSessionSummary | undefined>();
  const [activeOrgId, setActiveOrgIdState] = useState<string | undefined>();
  const [activeRole, setActiveRoleState] = useState<Role | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [offlineMode, setOfflineMode] = useState(false);
  const [offlineBanner, setOfflineBanner] = useState<string | undefined>();
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [proactiveLogin, setProactiveLogin] = useState<
    { identifier?: string; triggeredAt: number } | undefined
  >();
  const logoutCleanupsRef = useRef(new Set<LogoutCleanup>());
  const tokenRef = useRef<string | undefined>(undefined);
  const sessionRef = useRef<AuthSessionSummary | undefined>(undefined);
  const activeOrgIdRef = useRef<string | undefined>(undefined);
  const activeRoleRef = useRef<Role | undefined>(undefined);

  const hydrate = useCallback(
    async (tokenValue: string, preferredOrgId?: string, preferredRole?: Role) => {
      const currentSession = await authClient.me({
        token: tokenValue,
        ...(preferredOrgId ? { orgId: preferredOrgId } : {}),
      });
      const resolvedOrgId = currentSession.activeOrgId ?? preferredOrgId;
      if (resolvedOrgId) {
        await setStoredValue(ACTIVE_ORG_STORAGE_KEY, resolvedOrgId);
      }
      const availableRoles = new Set(
        (
          currentSession.activeOrganization?.roles ??
          currentSession.organizations.find((organization) => organization.orgId === resolvedOrgId)
            ?.roles ??
          currentSession.organizations[0]?.roles ??
          []
        ).filter(isOrgRole),
      );
      const resolvedRole =
        preferredRole && isOrgRole(preferredRole) && availableRoles.has(preferredRole)
          ? preferredRole
          : sessionDefaultRole(currentSession);
      if (resolvedRole) {
        await setStoredValue(ACTIVE_ROLE_STORAGE_KEY, resolvedRole);
      }
      tokenRef.current = tokenValue;
      sessionRef.current = currentSession;
      activeOrgIdRef.current = resolvedOrgId;
      activeRoleRef.current = resolvedRole;
      setToken(tokenValue);
      setSession(currentSession);
      setActiveOrgIdState(resolvedOrgId);
      setActiveRoleState(resolvedRole);
      setStatus("authenticated");
      setOfflineMode(false);
      setOfflineBanner(undefined);
      setProactiveLogin(undefined);
      setError(undefined);
      await applySessionLocalePreference(currentSession.user.preferredLocale);
    },
    [],
  );

  const clearSession = useCallback(async () => {
    await Promise.all([
      deleteStoredValue(SESSION_STORAGE_KEY),
      deleteStoredValue(SESSION_EXPIRES_AT_STORAGE_KEY),
      deleteStoredValue(ACTIVE_ORG_STORAGE_KEY),
      deleteStoredValue(ACTIVE_ROLE_STORAGE_KEY),
    ]);
    setToken(undefined);
    setSession(undefined);
    setActiveOrgIdState(undefined);
    setActiveRoleState(undefined);
    tokenRef.current = undefined;
    sessionRef.current = undefined;
    activeOrgIdRef.current = undefined;
    activeRoleRef.current = undefined;
    setStatus("unauthenticated");
    setOfflineMode(false);
    setOfflineBanner(undefined);
  }, []);

  const clearExpiredSession = useCallback(async () => {
    await clearSession();
    setError("Your session expired. Sign in again to continue.");
  }, [clearSession]);

  const maybePromptForBiometric = useCallback(async () => {
    if ((await getStoredValue(BIOMETRIC_PROMPTED_STORAGE_KEY)) === "1") {
      return;
    }
    if (!(await biometricAvailable())) {
      return;
    }
    await setStoredValue(BIOMETRIC_PROMPTED_STORAGE_KEY, "1");
    Alert.alert("Unlock Zook faster?", "Use Face ID or your device biometrics next time.", [
      { text: "Not now", style: "cancel" },
      {
        text: "Enable",
        onPress: () => {
          void setStoredBiometricUnlockEnabled(true).then((enabled) => {
            setBiometricEnabledState(enabled);
          });
        },
      },
    ]);
  }, []);

  const checkProactiveExpiry = useCallback(async () => {
    if (status !== "authenticated" || !token) {
      return;
    }
    const storedExpiresAt = await getStoredValue(SESSION_EXPIRES_AT_STORAGE_KEY);
    const expiresAt = storedExpiresAt ? new Date(storedExpiresAt).getTime() : Number.NaN;
    if (!Number.isFinite(expiresAt)) {
      return;
    }
    if (Date.now() >= expiresAt - SESSION_PROACTIVE_WINDOW_MS) {
      setProactiveLogin({
        identifier: session?.user.email ?? session?.user.phone ?? undefined,
        triggeredAt: Date.now(),
      });
    }
  }, [session?.user.email, session?.user.phone, status, token]);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setOfflineMode(false);
    setOfflineBanner(undefined);
    if (isOfflineDemoMode()) {
      const [storedOrgId, storedRole, demoLoggedOut] = await Promise.all([
        getStoredValue(ACTIVE_ORG_STORAGE_KEY),
        getStoredValue(ACTIVE_ROLE_STORAGE_KEY),
        getStoredValue(OFFLINE_DEMO_LOGGED_OUT_STORAGE_KEY),
      ]);
      if (demoLoggedOut === "true") {
        setToken(undefined);
        setSession(undefined);
        setActiveOrgIdState(undefined);
        setActiveRoleState(undefined);
        tokenRef.current = undefined;
        sessionRef.current = undefined;
        activeOrgIdRef.current = undefined;
        activeRoleRef.current = undefined;
        setStatus("unauthenticated");
        return;
      }
      await hydrate(
        DEMO_AUTH_TOKEN,
        storedOrgId ?? undefined,
        (storedRole as Role | null) ?? undefined,
      );
      return;
    }

    const storedBiometricEnabled = (await getStoredValue(BIOMETRIC_ENABLED_STORAGE_KEY)) === "1";
    setBiometricEnabledState(storedBiometricEnabled);
    if (storedBiometricEnabled) {
      const unlocked = await authenticateBiometric();
      if (!unlocked) {
        setStatus("unauthenticated");
        setToken(undefined);
        setSession(undefined);
        tokenRef.current = undefined;
        sessionRef.current = undefined;
        return;
      }
    }

    const [storedToken, storedOrgId, storedRole] = await Promise.all([
      getStoredValue(SESSION_STORAGE_KEY),
      getStoredValue(ACTIVE_ORG_STORAGE_KEY),
      getStoredValue(ACTIVE_ROLE_STORAGE_KEY),
    ]);

    if (!storedToken) {
      setStatus("unauthenticated");
      setToken(undefined);
      setSession(undefined);
      setActiveOrgIdState(storedOrgId ?? undefined);
      setActiveRoleState((storedRole as Role | null) ?? undefined);
      tokenRef.current = undefined;
      sessionRef.current = undefined;
      activeOrgIdRef.current = storedOrgId ?? undefined;
      activeRoleRef.current = (storedRole as Role | null) ?? undefined;
      return;
    }

    try {
      await hydrate(
        storedToken,
        storedOrgId ?? undefined,
        (storedRole as Role | null) ?? undefined,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        await clearSession();
        return;
      }
      setToken(storedToken);
      setSession(undefined);
      setActiveOrgIdState(storedOrgId ?? undefined);
      setActiveRoleState((storedRole as Role | null) ?? undefined);
      tokenRef.current = storedToken;
      sessionRef.current = undefined;
      activeOrgIdRef.current = storedOrgId ?? undefined;
      activeRoleRef.current = (storedRole as Role | null) ?? undefined;
      setStatus("authenticated");
      setOfflineMode(true);
      setOfflineBanner("Couldn't reach server - working offline");
    }
  }, [clearSession, hydrate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    void checkProactiveExpiry();
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "active") {
        void checkProactiveExpiry();
      }
    });
    return () => {
      subscription.remove();
    };
  }, [checkProactiveExpiry]);

  const requestOtp = useCallback(async (identifier: string) => {
    const result = await authClient.requestOtp(identifier);
    setError(undefined);
    return result;
  }, []);

  const verifyOtp = useCallback(
    async (identifier: string, code: string) => {
      const normalizedCode = sanitizeOtpCode(code);
      const result = await authClient.verifyOtp(identifier, normalizedCode);
      const expiresAt = normalizeSessionExpiresAt(result.expiresAt);
      await deleteStoredValue(OFFLINE_DEMO_LOGGED_OUT_STORAGE_KEY);
      await Promise.all([
        setStoredValue(SESSION_STORAGE_KEY, result.token),
        setStoredValue(SESSION_EXPIRES_AT_STORAGE_KEY, expiresAt),
      ]);
      await hydrate(result.token);
      await maybePromptForBiometric();
    },
    [hydrate, maybePromptForBiometric],
  );

  const completeTokenSignIn = useCallback(
    async (tokenValue: string, expiresAtValue?: string | null) => {
      const expiresAt = normalizeSessionExpiresAt(expiresAtValue);
      await deleteStoredValue(OFFLINE_DEMO_LOGGED_OUT_STORAGE_KEY);
      await Promise.all([
        setStoredValue(SESSION_STORAGE_KEY, tokenValue),
        setStoredValue(SESSION_EXPIRES_AT_STORAGE_KEY, expiresAt),
      ]);
      await hydrate(tokenValue, activeOrgId, activeRole);
      await maybePromptForBiometric();
    },
    [activeOrgId, activeRole, hydrate, maybePromptForBiometric],
  );

  const signInWithApple = useCallback(
    async (identityToken: string, fullName?: string) => {
      const result = await authClient.signInWithApple(identityToken, fullName);
      await completeTokenSignIn(result.token, result.expiresAt);
    },
    [completeTokenSignIn],
  );

  const signInWithGoogle = useCallback(
    async (idToken: string) => {
      const result = await authClient.signInWithGoogle(idToken);
      await completeTokenSignIn(result.token, result.expiresAt);
    },
    [completeTokenSignIn],
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
        await authClient.logout(token);
      }
    } finally {
      if (isOfflineDemoMode()) {
        await setStoredValue(OFFLINE_DEMO_LOGGED_OUT_STORAGE_KEY, "true");
        await clearSession();
      } else {
        await clearSession();
      }
    }
  }, [clearSession, token]);

  const setActiveOrgId = useCallback(
    async (orgId: string) => {
      const tokenValue = tokenRef.current;
      const currentSession = sessionRef.current;
      const targetOrg = currentSession?.organizations.find(
        (organization) => organization.orgId === orgId,
      );
      if (!tokenValue) {
        return;
      }
      if (!targetOrg) {
        throw new Error("Organization not available for this account");
      }
      const currentRole = activeRoleRef.current;
      const correctedRole =
        currentRole && isOrgRole(currentRole) && targetOrg.roles.includes(currentRole)
          ? currentRole
          : defaultRoleForOrg(targetOrg.roles);
      await Promise.all([
        setStoredValue(ACTIVE_ORG_STORAGE_KEY, orgId),
        correctedRole
          ? setStoredValue(ACTIVE_ROLE_STORAGE_KEY, correctedRole)
          : deleteStoredValue(ACTIVE_ROLE_STORAGE_KEY),
      ]);
      activeOrgIdRef.current = orgId;
      activeRoleRef.current = correctedRole;
      setActiveOrgIdState(orgId);
      setActiveRoleState(correctedRole);
      await hydrate(tokenValue, orgId, correctedRole);
      await invalidateAllQueries();
    },
    [hydrate],
  );

  const setActiveRole = useCallback(
    async (role: Role) => {
      const tokenValue = tokenRef.current;
      const currentSession = sessionRef.current;
      const currentOrgId =
        activeOrgIdRef.current ??
        currentSession?.activeOrgId ??
        currentSession?.activeOrganization?.orgId;
      const activeOrg = currentSession?.organizations.find(
        (organization) => organization.orgId === currentOrgId,
      );
      if (!tokenValue) {
        return;
      }
      if (!isOrgRole(role) || !activeOrg?.roles.includes(role)) {
        throw new Error("Role not available in active org");
      }
      await setStoredValue(ACTIVE_ROLE_STORAGE_KEY, role);
      activeRoleRef.current = role;
      setActiveRoleState(role);
      await hydrate(tokenValue, currentOrgId, role);
      await invalidateRoleScopedQueries();
    },
    [hydrate],
  );

  const setBiometricEnabled = useCallback(async (enabled: boolean) => {
    const stored = await setStoredBiometricUnlockEnabled(enabled);
    setBiometricEnabledState(stored && enabled);
    return stored;
  }, []);

  const hasAnyRole = useCallback(
    (...roles: Role[]) =>
      Boolean(
        session?.organizations.some((organization) =>
          organization.roles.some((role) => roles.includes(role)),
        ),
      ),
    [session],
  );

  const hasActiveRole = useCallback(
    (...roles: Role[]) => Boolean(activeRole && roles.includes(activeRole)),
    [activeRole],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      token,
      session,
      activeOrgId,
      activeRole,
      defaultRoute: defaultRouteForSession(session, activeRole),
      offlineMode,
      offlineBanner,
      proactiveLogin,
      biometricEnabled,
      requestOtp,
      signInWithApple,
      signInWithGoogle,
      verifyOtp,
      logout,
      refresh,
      clearExpiredSession,
      setActiveOrgId,
      setActiveRole,
      setBiometricEnabled,
      hasAnyRole,
      hasActiveRole,
      registerLogoutCleanup,
      error,
    }),
    [
      activeOrgId,
      activeRole,
      biometricEnabled,
      clearExpiredSession,
      error,
      hasActiveRole,
      hasAnyRole,
      logout,
      offlineBanner,
      offlineMode,
      proactiveLogin,
      refresh,
      registerLogoutCleanup,
      requestOtp,
      session,
      setActiveOrgId,
      setActiveRole,
      setBiometricEnabled,
      signInWithApple,
      signInWithGoogle,
      status,
      token,
      verifyOtp,
    ],
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

export function useActivePermissions(): Set<Permission> {
  const { activeOrgId, session } = useAuth();
  const activeOrg = useMemo(() => {
    return (
      session?.activeOrganization ??
      session?.organizations.find((organization) => organization.orgId === activeOrgId) ??
      session?.organizations[0]
    );
  }, [activeOrgId, session?.activeOrganization, session?.organizations]);
  return useMemo(() => new Set(activeOrg?.permissions ?? []), [activeOrg?.permissions]);
}

export function useHasPermission(permission: Permission): boolean {
  const permissions = useActivePermissions();
  return permissions.has(permission);
}

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    if (/network request failed/i.test(error.message)) {
      return "We couldn't reach Zook. Check your connection and try again.";
    }
    return error.message;
  }
  return "Something went wrong.";
}
