import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import type { Permission, Role } from "@zook/core";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";

import { AuthProvider, setAuthQueryClient, useAuth } from "@/lib/auth";
import { DemoBanner } from "@/components/demo-banner";
import { NetworkBanner, OfflineBanner } from "@/components/primitives";
import { BottomNavVisibilityProvider } from "@/components/primitives/bottom-nav-context";
import { ToastHost } from "@/components/toast-host";
import { BranchSelectionProvider } from "@/lib/branch-selection";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { getMobileRuntimeConfigError } from "@/lib/runtime-mode";
import { setApiAuthHandlers } from "@/lib/api";
import { PushNotificationsProvider } from "@/lib/push-notifications";
import { PrivilegedPinProvider } from "@/components/privileged-pin-modal";
import { checkRouteAccess, routeForRole } from "@/lib/route-guards";
import { Sentry, initMobileSentry } from "@/lib/sentry";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import { memberDashboardQueryOptions } from "@/lib/query-hooks";
import { colors } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { useRoleContext } from "@/lib/role-context";

initMobileSentry();

const ONBOARDING_STORAGE_KEY = "zook_onboarding_completed";
const ONBOARDING_COMPLETED = "true";
const EMPTY_PERMISSIONS = new Set<Permission>();

function encodeRedirectTarget(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key === "redirect" || value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) {
          searchParams.append(key, entry);
        }
      }
      continue;
    }
    if (value) {
      searchParams.set(key, value);
    }
  }
  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function safeRedirectTarget(value?: string | string[]) {
  const target = firstParam(value);
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return null;
  }
  if (target.startsWith("/login")) {
    return null;
  }
  return target;
}

function isPublicUnauthenticatedRoute(pathname: string) {
  return (
    pathname === "/find-gyms" ||
    pathname.startsWith("/gym/") ||
    pathname.startsWith("/g/") ||
    pathname.startsWith("/join/") ||
    pathname.startsWith("/r/")
  );
}

function redirectAllowedForSession(
  target: string | null,
  helpers: {
    hasAnyRole: (...roles: Role[]) => boolean;
  },
) {
  if (!target) return null;
  if (target.startsWith("/platform")) {
    return helpers.hasAnyRole("PLATFORM_ADMIN") ? target : null;
  }
  if (target.startsWith("/owner")) {
    return helpers.hasAnyRole("OWNER", "ADMIN") ? target : null;
  }
  if (target.startsWith("/reception")) {
    return helpers.hasAnyRole("RECEPTIONIST", "OWNER", "ADMIN") ? target : null;
  }
  if (target.startsWith("/trainer")) {
    return helpers.hasAnyRole("TRAINER", "OWNER", "ADMIN") ? target : null;
  }
  return target;
}

function isPaymentReturnDeepLink(url: string) {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "zook:" && parsed.hostname === "payments" && parsed.pathname === "/return"
    );
  } catch {
    return false;
  }
}

function LayoutContent() {
  const {
    activeOrgId,
    clearExpiredSession,
    defaultRoute,
    offlineBanner,
    proactiveLogin,
    refresh,
    session,
    status,
    token,
  } = useAuth();
  const roleContext = useRoleContext();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const runtimeConfigError = getMobileRuntimeConfigError();
  const pathname = usePathname();
  const router = useRouter();
  const activeRole = roleContext?.role;
  const activePermissions = roleContext?.permissions ?? EMPTY_PERMISSIONS;
  const isPlatformAdmin = Boolean(roleContext?.isPlatformAdmin ?? session?.user.isPlatformAdmin);
  const searchParams = useGlobalSearchParams() as Record<string, string | string[] | undefined>;
  const [onboardingFlag, setOnboardingFlag] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    return setAuthQueryClient(queryClient);
  }, [queryClient]);

  useEffect(() => {
    return setApiAuthHandlers({
      onExpired: async () => {
        const nextToken = await refresh().catch(() => undefined);
        if (nextToken) {
          return nextToken;
        }
        await clearExpiredSession();
        queryClient.clear();
        showToast({
          title: t("auth.sessionExpiredTitle"),
          message: t("auth.sessionExpiredBody"),
          tone: "amber",
        });
        router.replace("/login?reason=expired" as never);
      },
      onForbidden: () => {
        showToast({
          title: "Permission denied",
          message: "You don't have permission for that action.",
          tone: "amber",
        });
        if (router.canGoBack()) {
          router.back();
        }
      },
    });
  }, [clearExpiredSession, queryClient, refresh, router, t]);

  useEffect(() => {
    const handleUrl = (url: string | null) => {
      if (!url || !isPaymentReturnDeepLink(url)) {
        return;
      }
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "membership"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["shop", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["org"] }),
      ]).finally(() => {
        showToast({ title: "Payment status refreshed" });
        router.replace("/membership?focus=membership" as never);
      });
    };

    const subscription = Linking.addEventListener("url", (event) => handleUrl(event.url));
    void Linking.getInitialURL().then(handleUrl);
    return () => subscription.remove();
  }, [queryClient, router]);

  useEffect(() => {
    if (status !== "authenticated" || !token) {
      return;
    }
    void queryClient.prefetchQuery(memberDashboardQueryOptions({ activeOrgId, token }));
  }, [activeOrgId, queryClient, status, token]);

  useEffect(() => {
    if (status !== "authenticated" || !proactiveLogin) {
      return;
    }
    const params = new URLSearchParams({ reason: "proactive" });
    if (proactiveLogin.identifier) {
      params.set("prefill", proactiveLogin.identifier);
    }
    router.replace(`/login?${params.toString()}` as never);
  }, [proactiveLogin, router, status]);

  useEffect(() => {
    let mounted = true;
    void getStoredValue(ONBOARDING_STORAGE_KEY).then((stored) => {
      if (mounted) {
        setOnboardingFlag(stored);
      }
    });
    return () => {
      mounted = false;
    };
  }, [pathname, status]);

  useEffect(() => {
    if (status === "loading" || onboardingFlag === undefined) {
      return;
    }
    const isOnboardingRoute = pathname.startsWith("/onboarding");
    const isPublicRoute = isPublicUnauthenticatedRoute(pathname);

    if (status === "unauthenticated") {
      if (isPublicRoute) {
        return;
      }
      if (onboardingFlag === null) {
        if (pathname === "/login") {
          return;
        }
        if (!isOnboardingRoute) {
          router.replace("/onboarding" as never);
        }
        return;
      }
      if (isOnboardingRoute) {
        router.replace("/login" as never);
        return;
      }
      if (pathname !== "/login") {
        const redirect = encodeRedirectTarget(pathname, searchParams);
        router.replace(`/login?redirect=${encodeURIComponent(redirect)}` as never);
      }
      return;
    }

    if ((session?.organizations.length ?? 0) === 0 && !session?.user.isPlatformAdmin) {
      if (isPublicRoute) {
        if (onboardingFlag !== ONBOARDING_COMPLETED) {
          void setStoredValue(ONBOARDING_STORAGE_KEY, ONBOARDING_COMPLETED).then(() => {
            setOnboardingFlag(ONBOARDING_COMPLETED);
          });
        }
        return;
      }
      if (onboardingFlag !== ONBOARDING_COMPLETED && pathname !== "/onboarding/role-question") {
        router.replace("/onboarding/role-question" as never);
      }
      return;
    }

    if ((session?.organizations.length ?? 0) === 0 && session?.user.isPlatformAdmin) {
      if (!pathname.startsWith("/platform")) {
        router.replace("/platform" as never);
      }
      return;
    }

    if (onboardingFlag !== ONBOARDING_COMPLETED) {
      void setStoredValue(ONBOARDING_STORAGE_KEY, ONBOARDING_COMPLETED).then(() => {
        setOnboardingFlag(ONBOARDING_COMPLETED);
      });
    }

    if (isOnboardingRoute) {
      router.replace(defaultRoute as never);
      return;
    }

    if (pathname === "/login" && firstParam(searchParams.reason) === "proactive") {
      return;
    }

    if (pathname === "/login") {
      const validatedRedirect = redirectAllowedForSession(
        safeRedirectTarget(searchParams.redirect),
        {
          hasAnyRole: (...roles) =>
            roles.some((role) =>
              role === "PLATFORM_ADMIN"
                ? isPlatformAdmin
                : Boolean(roleContext?.availableRoles.includes(role)),
            ),
        },
      );
      router.replace((validatedRedirect ?? defaultRoute) as never);
      return;
    }

    if (pathname === "/" && defaultRoute !== "/") {
      router.replace(defaultRoute as never);
      return;
    }

    const hasRequiredPermission = checkRouteAccess(
      pathname,
      activePermissions,
      isPlatformAdmin,
    );
    if (!hasRequiredPermission) {
      router.replace(routeForRole(activeRole ?? "MEMBER") as never);
      return;
    }
  }, [
    activeRole,
    activePermissions,
    defaultRoute,
    isPlatformAdmin,
    onboardingFlag,
    pathname,
    roleContext?.availableRoles,
    router,
    searchParams,
    session?.organizations.length,
    session?.user.isPlatformAdmin,
    status,
  ]);

  if (runtimeConfigError) {
    return (
      <View style={styles.configError}>
        <Text style={styles.configErrorTitle}>{t("app.configErrorTitle")}</Text>
        <Text style={styles.configErrorBody}>{t("app.configErrorBody")}</Text>
      </View>
    );
  }

  if (status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.lime} />
        <Text style={styles.loadingText}>{t("app.loadingSession")}</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <NetworkBanner />
      {offlineBanner ? <OfflineBanner>{offlineBanner}</OfflineBanner> : null}
      <DemoBanner />
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: colors.bg },
          headerTintColor: "#f4f7ef",
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ animation: "none" }} />
        <Stack.Screen name="plans/index" options={{ animation: "none" }} />
        <Stack.Screen name="scan" options={{ animation: "none" }} />
        <Stack.Screen name="tracking" options={{ animation: "none" }} />
        <Stack.Screen name="profile" options={{ animation: "none" }} />
        <Stack.Screen name="notifications/index" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="membership" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="find-gyms" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="shop" options={{ animation: "none" }} />
        <Stack.Screen name="assistant" options={{ animation: "slide_from_right" }} />
        <Stack.Screen
          name="tracking-entry"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="tracking-history" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="owner/index" options={{ animation: "none" }} />
        <Stack.Screen name="dashboard" options={{ animation: "fade" }} />
        <Stack.Screen name="platform" options={{ animation: "none" }} />
        <Stack.Screen name="reception" options={{ animation: "none" }} />
        <Stack.Screen name="onboarding" options={{ animation: "fade" }} />
        <Stack.Screen name="login" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="trainer/index" options={{ animation: "none" }} />
        <Stack.Screen name="trainer/client/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen
          name="trainer/client/[id]/ai-draft"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen name="gym/[username]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen
          name="attendance/[attendanceRecordId]"
          options={{ presentation: "modal", animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="owner/member/[id]" options={{ animation: "slide_from_right" }} />
      </Stack>
      <ToastHost />
    </>
  );
}

export default function Layout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
          },
        },
      }),
  );
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    void SplashScreen.preventAutoHideAsync().catch(() => {
      // Expo Go can reject duplicate splash lifecycle calls during fast refresh.
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync().catch(() => {
        // Ignore splash cleanup races during local development.
      });
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.gestureRoot}>
        <Sentry.ErrorBoundary fallback={({ resetError }) => <RootErrorFallback onRetry={resetError} />}>
          <QueryClientProvider client={queryClient}>
            <I18nProvider>
              <AuthProvider>
                <BranchSelectionProvider>
                  <BottomNavVisibilityProvider>
                    <PrivilegedPinProvider>
                      <PushNotificationsProvider>
                        <LayoutContent />
                      </PushNotificationsProvider>
                    </PrivilegedPinProvider>
                  </BottomNavVisibilityProvider>
                </BranchSelectionProvider>
              </AuthProvider>
            </I18nProvider>
          </QueryClientProvider>
        </Sentry.ErrorBoundary>
      </View>
    </SafeAreaProvider>
  );
}

function RootErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={styles.configError}>
      <Text style={styles.configErrorTitle}>Something went wrong</Text>
      <Text style={styles.configErrorBody}>
        Zook hit an unexpected error and reported it to our team. Try again, or restart the app if
        the problem continues.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        style={styles.retryButton}
      >
        <Text style={styles.retryButtonText}>Try again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    color: colors.text,
    fontSize: 14,
  },
  configError: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  configErrorTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  configErrorBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.lime,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryButtonText: {
    color: "#050805",
    fontSize: 14,
    fontWeight: "700",
  },
});
