import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from "@expo-google-fonts/inter";
import * as SplashScreen from "expo-splash-screen";

import { AuthProvider, useAuth } from "@/lib/auth";
import { BranchSelectionProvider } from "@/lib/branch-selection";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { getMobileRuntimeConfigError, isOfflineDemoMode } from "@/lib/runtime-mode";
import { PushNotificationsProvider } from "@/lib/push-notifications";
import { colors, layout } from "@/lib/theme";

SplashScreen.preventAutoHideAsync();

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

function LayoutContent() {
  const { defaultRoute, hasActiveRole, hasAnyRole, logout, status } = useAuth();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const runtimeConfigError = getMobileRuntimeConfigError();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useGlobalSearchParams() as Record<string, string | string[] | undefined>;

  useEffect(() => {
    if (status === "loading") {
      return;
    }
    if (status === "unauthenticated") {
      if (pathname !== "/login") {
        const redirect = encodeRedirectTarget(pathname, searchParams);
        router.replace(`/login?redirect=${encodeURIComponent(redirect)}` as never);
      }
      return;
    }

    if (pathname === "/login") {
      router.replace((safeRedirectTarget(searchParams.redirect) ?? defaultRoute) as never);
      return;
    }

    if (pathname === "/" && defaultRoute !== "/") {
      router.replace(defaultRoute as never);
      return;
    }

    if (pathname.startsWith("/platform") && !hasActiveRole("PLATFORM_ADMIN")) {
      router.replace(defaultRoute as never);
      return;
    }
    if (
      pathname.startsWith("/owner") &&
      (!hasAnyRole("OWNER", "ADMIN") || !hasActiveRole("OWNER", "ADMIN"))
    ) {
      router.replace(defaultRoute as never);
      return;
    }
    if (
      pathname.startsWith("/reception") &&
      (!hasAnyRole("RECEPTIONIST", "OWNER", "ADMIN") ||
        !hasActiveRole("RECEPTIONIST", "OWNER", "ADMIN"))
    ) {
      router.replace(defaultRoute as never);
      return;
    }
    if (
      pathname.startsWith("/trainer") &&
      (!hasAnyRole("TRAINER", "OWNER", "ADMIN") || !hasActiveRole("TRAINER", "OWNER", "ADMIN"))
    ) {
      router.replace(defaultRoute as never);
    }
  }, [defaultRoute, hasActiveRole, hasAnyRole, pathname, router, searchParams, status]);

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
      <Stack
        screenOptions={{
          headerShown: false,
          headerStyle: { backgroundColor: "#070908" },
          headerTintColor: "#f4f7ef",
          contentStyle: { backgroundColor: "#070908" },
        }}
      >
        <Stack.Screen name="index" options={{ animation: "none" }} />
        <Stack.Screen name="plans" options={{ animation: "none" }} />
        <Stack.Screen name="more" options={{ animation: "none" }} />
        <Stack.Screen name="scan" options={{ animation: "none" }} />
        <Stack.Screen name="tracking" options={{ animation: "none" }} />
        <Stack.Screen name="shop" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="membership" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="find-gyms" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="assistant" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="tracking-entry" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="tracking-history" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="owner" options={{ animation: "none" }} />
        <Stack.Screen name="platform" options={{ animation: "none" }} />
        <Stack.Screen name="reception" options={{ animation: "none" }} />
        <Stack.Screen name="trainer/index" options={{ animation: "none" }} />
        <Stack.Screen name="trainer/client/[id]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen
          name="trainer/client/[id]/ai-draft"
          options={{ animation: "slide_from_right" }}
        />
        <Stack.Screen name="gym/[username]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen
          name="attendance/[attendanceRecordId]"
          options={{ animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="owner/member/[id]" options={{ animation: "slide_from_right" }} />
      </Stack>
      {isOfflineDemoMode() ? (
        <View
          style={[
            styles.demoStrip,
            {
              height: layout.demoStripHeight + insets.top,
              paddingTop: insets.top,
            },
          ]}
        >
          <View style={styles.demoDot} />
          <Text style={styles.demoStripText}>Demo · sample data</Text>
          <Pressable
            onPress={() => void logout()}
            accessibilityRole="button"
            accessibilityLabel="Use real account"
            hitSlop={8}
          >
            <Text style={styles.demoStripLink}>Use real account</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );
}

export default function Layout() {
  const [queryClient] = useState(() => new QueryClient());
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <AuthProvider>
          <BranchSelectionProvider>
            <PushNotificationsProvider>
              <LayoutContent />
            </PushNotificationsProvider>
          </BranchSelectionProvider>
        </AuthProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
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
  demoStrip: {
    position: "absolute",
    zIndex: 100,
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(242,201,76,0.22)",
    backgroundColor: "rgba(242,201,76,0.1)",
  },
  demoDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.amber,
  },
  demoStripText: {
    flex: 1,
    color: colors.amber,
    fontSize: 11,
    fontWeight: "700",
  },
  demoStripLink: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});
