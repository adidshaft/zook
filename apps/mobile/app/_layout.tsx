import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
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
import {
  getMobileRuntimeConfigError,
  isOfflineDemoMode,
} from "@/lib/runtime-mode";
import { PushNotificationsProvider } from "@/lib/push-notifications";
import { colors } from "@/lib/theme";

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
  const { defaultRoute, hasActiveRole, hasAnyRole, status } = useAuth();
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
        <Text style={styles.configErrorTitle}>Zook can’t open in this build.</Text>
        <Text style={styles.configErrorBody}>
          Please update the app or contact support if this keeps happening.
        </Text>
      </View>
    );
  }

  if (status === "loading") {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.lime} />
        <Text style={styles.loadingText}>Restoring your Zook session...</Text>
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
        <Stack.Screen name="gym/[username]" options={{ animation: "slide_from_right" }} />
        <Stack.Screen
          name="attendance/[attendanceRecordId]"
          options={{ animation: "slide_from_bottom" }}
        />
        <Stack.Screen name="owner/member/[id]" options={{ animation: "slide_from_right" }} />
      </Stack>
      {isOfflineDemoMode() ? (
        <View pointerEvents="none" style={[styles.demoBadge, { top: Math.max(insets.top + 8, 12) }]}>
          <Text style={styles.demoBadgeText}>DEMO MODE</Text>
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
      <AuthProvider>
        <PushNotificationsProvider>
          <LayoutContent />
        </PushNotificationsProvider>
      </AuthProvider>
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
  configErrorMeta: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  demoBadge: {
    position: "absolute",
    left: "50%",
    minWidth: 104,
    alignItems: "center",
    transform: [{ translateX: -52 }],
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(242,201,76,0.45)",
    backgroundColor: "rgba(242,201,76,0.16)",
  },
  demoBadgeText: {
    color: colors.amber,
    fontSize: 11,
    fontWeight: "900",
  },
});
