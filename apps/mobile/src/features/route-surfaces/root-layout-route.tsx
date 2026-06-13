import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import type { Permission, Role } from "@zook/core";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Linking, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
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
import { enableFreeze } from "react-native-screens";
import { getStoredValue, setStoredValue } from "@/lib/storage";
import { memberHomeQueryOptions } from "@/lib/domains";
import { spacing, ThemeProvider, useTheme } from "@/lib/theme/index";
import { showToast } from "@/lib/toast";
import { useRoleContext } from "@/lib/role-context";

initMobileSentry();
enableFreeze(true);

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
    pathname === "/gyms" ||
    pathname.startsWith("/gyms/") ||
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

function paymentReturnTarget(url: string) {
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("target") ?? parsed.searchParams.get("context") ?? "";
  } catch {
    return "";
  }
}

function LayoutContent() {
  const { mode, palette } = useTheme();
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
  const isDemoMode = Boolean(roleContext?.isDemo);
  const activePermissions = roleContext?.permissions ?? EMPTY_PERMISSIONS;
  const isPlatformAdmin = Boolean(roleContext?.isPlatformAdmin ?? session?.user.isPlatformAdmin);
  const searchParams = useGlobalSearchParams() as Record<string, string | string[] | undefined>;
  const [onboardingFlag, setOnboardingFlag] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (status !== "loading" && onboardingFlag !== undefined) {
      void SplashScreen.hideAsync().catch(() => {
        // Ignore splash cleanup races during local development.
      });
    }
  }, [status, onboardingFlag]);

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
      onForbidden: (error) => {
        if (
          error.code === "SAAS_BILLING_SETUP_REQUIRED" ||
          error.code === "SAAS_PAYMENT_REQUIRED"
        ) {
          showToast({
            title: "Billing setup required",
            message: "Open billing to set up the trial mandate before continuing.",
            tone: "amber",
          });
          router.replace("/owner/billing" as never);
          return;
        }
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
      const target = paymentReturnTarget(url);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "memberships"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "membership"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "dashboard"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "shop-orders"] }),
        queryClient.invalidateQueries({ queryKey: ["shop", "products"] }),
        queryClient.invalidateQueries({ queryKey: ["org"] }),
        queryClient.invalidateQueries({ queryKey: ["org", activeOrgId, "billing"] }),
      ]).finally(() => {
        showToast({ title: "Payment status refreshed" });
        if (target === "owner-billing") {
          router.replace("/owner/billing" as never);
          return;
        }
        if (target === "shop") {
          router.replace("/shop" as never);
          return;
        }
        router.replace("/membership?focus=membership" as never);
      });
    };

    const subscription = Linking.addEventListener("url", (event) => handleUrl(event.url));
    void Linking.getInitialURL().then(handleUrl);
    return () => subscription.remove();
  }, [activeOrgId, queryClient, router]);

  useEffect(() => {
    if (status !== "authenticated" || !token) {
      return;
    }
    void queryClient.prefetchQuery(memberHomeQueryOptions({ activeOrgId, token }));
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
      if (onboardingFlag !== ONBOARDING_COMPLETED) {
        void setStoredValue(ONBOARDING_STORAGE_KEY, ONBOARDING_COMPLETED).then(() => {
          setOnboardingFlag(ONBOARDING_COMPLETED);
        });
      }
      if (isPublicRoute) {
        return;
      }
      router.replace("/gyms" as never);
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
      <View style={[styles.configError, { backgroundColor: palette.bg.app }]}>
        <Text style={[styles.configErrorTitle, { color: palette.text.primary }]}>{t("app.configErrorTitle")}</Text>
        <Text style={[styles.configErrorBody, { color: palette.text.secondary }]}>{t("app.configErrorBody")}</Text>
      </View>
    );
  }

  if (status === "loading") {
    return (
      <View style={[styles.loading, { backgroundColor: palette.bg.app }]}>
        <ActivityIndicator color={palette.accent.base} />
        <Text style={[styles.loadingText, { color: palette.text.secondary }]}>{t("app.loadingSession")}</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar
        style={mode === "dark" ? "light" : "dark"}
        backgroundColor={palette.bg.app}
      />
      <NetworkBanner />
      {offlineBanner || isDemoMode ? (
        <RuntimeBannerHost>
          {offlineBanner ? <OfflineBanner>{offlineBanner}</OfflineBanner> : null}
          <DemoBanner />
        </RuntimeBannerHost>
      ) : null}
      <Stack
        screenOptions={{
          // Screens render their own in-content header (AppHeader/ScreenHeader);
          // no native nav-bar header anywhere. Keeps headers consistent and stops
          // unregistered routes from leaking their raw route name as a title.
          headerShown: false,
          contentStyle: { backgroundColor: palette.bg.app },
        }}
      >
        <Stack.Screen name="(member)" options={{ animation: "none", headerShown: false }} />
        <Stack.Screen name="profile/index" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="profile/edit" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="profile/photo" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="profile/extra-fields" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="notifications/index" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="settings/index" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="settings/account" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="settings/appearance" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="settings/language" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="settings/notifications" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="settings/privacy" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="settings/support" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="membership/index" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="membership/buy" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="membership/history" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="membership/checkout" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="membership/receipt/[paymentId]" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="shop" options={{ animation: "none", headerShown: false }} />
        <Stack.Screen name="assistant" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="owner" options={{ animation: "none", headerShown: false }} />
        <Stack.Screen name="platform" options={{ animation: "none", headerShown: false }} />
        <Stack.Screen name="reception" options={{ animation: "none", headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ animation: "fade", headerShown: false }} />
        <Stack.Screen name="login" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="trainer" options={{ animation: "none", headerShown: false }} />
        <Stack.Screen name="gym/[username]" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="gyms/[username]" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="gyms/index" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="tracking" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="tracking-history" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="tracking-entry" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="plan/[assignmentId]" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen
          name="attendance/[attendanceRecordId]"
          options={{ presentation: "modal", animation: "slide_from_bottom", title: "Attendance" }}
        />
      </Stack>
      <ToastHost />
    </>
  );
}

function RuntimeBannerHost({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.runtimeBannerHost,
        { top: Math.max(spacing.xs, Math.max(insets.top, spacing.xs) - 76) },
      ]}
    >
      {children}
    </View>
  );
}


function ThemedGestureRoot({ queryClient }: { queryClient: QueryClient }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.gestureRoot, { backgroundColor: palette.bg.app }]}>
      <Sentry.ErrorBoundary
        fallback={({ resetError }) => <RootErrorFallback onRetry={resetError} />}
      >
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

  // Splash hide is now deferred until both fonts are loaded and Auth hydration completes in LayoutContent.

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <ThemedGestureRoot queryClient={queryClient} />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function RootErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { palette } = useTheme();
  return (
    <View style={[styles.configError, { backgroundColor: palette.bg.app }]}>
      <Text style={[styles.configErrorTitle, { color: palette.text.primary }]}>Something went wrong</Text>
      <Text style={[styles.configErrorBody, { color: palette.text.secondary }]}>
        Zook hit an unexpected error and reported it to our team. Try again, or restart the app if
        the problem continues.
      </Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel="Try again"
        style={[styles.retryButton, { backgroundColor: palette.accent.base }]}
      >
        <Text style={[styles.retryButtonText, { color: palette.text.onAccent }]}>Try again</Text>
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
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
  },
  configError: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    gap: 12,
  },
  configErrorTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  configErrorBody: {
    fontSize: 15,
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: "flex-start",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 999,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "700",
  },
  runtimeBannerHost: {
    left: 0,
    position: "absolute",
    right: 0,
    zIndex: 20,
    gap: 6,
    paddingHorizontal: 0,
  },
});
