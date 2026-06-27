import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import type { Permission, Role } from "@zook/core";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState, type ReactNode } from "react";
import { ActivityIndicator, Linking, LogBox, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import {
  Sora_500Medium,
  Sora_600SemiBold,
  Sora_700Bold,
  Sora_800ExtraBold,
} from "@expo-google-fonts/sora";
import * as SplashScreen from "expo-splash-screen";

import { AuthProvider, isQaResetInFlight, setAuthQueryClient, useAuth } from "@/lib/auth";
import { BrandMark } from "@/components/primitives";
import { TestDataBanner } from "@/components/test-data-banner";
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

if (__DEV__) {
  LogBox.ignoreAllLogs(true);
}

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
    pathname === "/qa" ||
    pathname.startsWith("/qa") ||
    pathname.startsWith("/__qa-role") ||
    pathname.startsWith("/__qa-open") ||
    pathname.startsWith("/__qa-reset") ||
    pathname.startsWith("/__demo-role") ||
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
  const isQaHelperRoute =
    pathname === "/__demo-role" ||
    pathname === "/__qa-role" ||
    pathname === "/__qa-reset" ||
    pathname === "/__qa-open";

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
        if (isQaResetInFlight() || isQaHelperRoute) {
          return;
        }
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
            title: t("owner.home.billingSetupRequired"),
            message: t("routeGuard.billingSetupRequiredBody"),
            tone: "amber",
          });
          router.replace("/owner/billing" as never);
          return;
        }
        showToast({
          title: t("routeGuard.permissionDeniedTitle"),
          message: t("routeGuard.permissionDeniedBody"),
          tone: "amber",
        });
        if (router.canGoBack()) {
          router.back();
        }
      },
    });
  }, [clearExpiredSession, isQaHelperRoute, queryClient, refresh, router, t]);

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
        showToast({ title: t("payments.statusRefreshed") });
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
  }, [activeOrgId, queryClient, router, t]);

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

    if (
      pathname === "/qa" ||
      pathname.startsWith("/qa") ||
      pathname.startsWith("/__qa-open") ||
      pathname.startsWith("/__demo-role") ||
      pathname.startsWith("/__qa-reset")
    ) {
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
    return <LaunchSurface subtitle={t("app.loadingSession")} />;
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
          <TestDataBanner />
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
        <Stack.Screen name="diet-history" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen name="plan/[assignmentId]" options={{ animation: "slide_from_right", headerShown: false }} />
        <Stack.Screen
          name="attendance/[attendanceRecordId]"
          options={{ presentation: "modal", animation: "slide_from_bottom", title: "Attendance" }}
        />
        <Stack.Screen name="checkin" options={{ animation: "none", headerShown: false }} />
        <Stack.Screen name="rewards" options={{ animation: "slide_from_right", headerShown: false }} />
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
        // Sit just below the safe-area top (below the notch / dynamic island)
        // so transient banners like the demo "Test data" badge aren't hidden
        // behind the island. The previous -76 offset pulled them up into it.
        { top: Math.max(insets.top, spacing.xs) + spacing.xs },
      ]}
    >
      {children}
    </View>
  );
}


function ThemedGestureRoot({ queryClient }: { queryClient: QueryClient }) {
  const { palette } = useTheme();
  return (
    <GestureHandlerRootView style={[styles.gestureRoot, { backgroundColor: palette.bg.app }]}>
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
    </GestureHandlerRootView>
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
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    Sora_500Medium,
    Sora_600SemiBold,
    Sora_700Bold,
    Sora_800ExtraBold,
  });
  const [fontLoadTimedOut, setFontLoadTimedOut] = useState(false);
  const appShellReady = fontsLoaded || fontLoadTimedOut;

  useEffect(() => {
    void SplashScreen.preventAutoHideAsync().catch(() => {
      // Expo Go can reject duplicate splash lifecycle calls during fast refresh.
    });
  }, []);

  useEffect(() => {
    if (fontsLoaded) {
      setFontLoadTimedOut(false);
      return;
    }
    const timeout = setTimeout(() => {
      setFontLoadTimedOut(true);
    }, 4000);
    return () => clearTimeout(timeout);
  }, [fontsLoaded]);

  useEffect(() => {
    if (!appShellReady) {
      return;
    }
    void SplashScreen.hideAsync().catch(() => {
      // Ignore splash cleanup races during local development.
    });
  }, [appShellReady]);

  return (
    <ThemeProvider>
      <SafeAreaProvider>
        {appShellReady ? <ThemedGestureRoot queryClient={queryClient} /> : <LaunchFallbackScreen />}
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

function LaunchFallbackScreen() {
  const { t } = useI18n();
  return <LaunchSurface subtitle={t("app.loadingSession")} />;
}

function LaunchSurface({ subtitle }: { subtitle: string }) {
  const { mode, palette } = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.loading, { backgroundColor: palette.bg.app }]}>
      <View
        style={[
          styles.loadingCard,
          {
            backgroundColor: mode === "dark" ? palette.surface.default : palette.bg.elevated,
            borderColor: palette.border.subtle,
          },
        ]}
      >
        <View
          pointerEvents="none"
          style={[
            styles.loadingStageFrame,
            {
              backgroundColor: mode === "dark" ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.56)",
              borderColor: palette.border.subtle,
            },
          ]}
        />
        <View style={styles.loadingBrandLockup}>
          <BrandMark size="lg" />
          <Text
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            style={[styles.loadingBrandText, { color: palette.text.primary }]}
          >
            ZOok
          </Text>
        </View>
        <Text style={[styles.loadingSubtitle, { color: palette.text.secondary }]}>
          {t("app.launchTagline")}
        </Text>
        <View style={styles.loadingFooter}>
          <ActivityIndicator color={palette.accent.base} />
          <Text style={[styles.loadingText, { color: palette.text.secondary }]}>{subtitle}</Text>
        </View>
      </View>
    </View>
  );
}

function RootErrorFallback({ onRetry }: { onRetry: () => void }) {
  const { palette } = useTheme();
  const { t } = useI18n();
  return (
    <View style={[styles.configError, { backgroundColor: palette.bg.app }]}>
      <Text style={[styles.configErrorTitle, { color: palette.text.primary }]}>{t("app.configErrorTitle")}</Text>
      <Text style={[styles.configErrorBody, { color: palette.text.secondary }]}>{t("app.configErrorBody")}</Text>
      <Pressable
        onPress={onRetry}
        accessibilityRole="button"
        accessibilityLabel={t("common.tryAgain")}
        style={[styles.retryButton, { backgroundColor: palette.accent.base }]}
      >
        <Text style={[styles.retryButtonText, { color: palette.text.onAccent }]}>{t("common.tryAgain")}</Text>
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
    overflow: "hidden",
    padding: 24,
    position: "relative",
  },
  loadingCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 28,
  },
  loadingStageFrame: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 28,
    borderWidth: 1,
  },
  loadingBrandLockup: {
    alignItems: "center",
    gap: 10,
    alignSelf: "stretch",
    justifyContent: "center",
  },
  loadingBrandText: {
    fontFamily: "Inter_800ExtraBold",
    fontSize: 46,
    lineHeight: 56,
    letterSpacing: -1.2,
    includeFontPadding: false,
    minWidth: 176,
    paddingHorizontal: 8,
    textAlign: "center",
  },
  loadingSubtitle: {
    fontSize: 15,
    lineHeight: 22,
    maxWidth: 240,
  },
  loadingFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
