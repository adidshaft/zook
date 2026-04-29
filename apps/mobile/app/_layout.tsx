import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useFonts, Inter_400Regular, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold, Inter_900Black } from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

import { AuthProvider, useAuth } from "@/lib/auth";
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

function decodeRedirectTarget(rawRedirect: string | string[] | undefined) {
  const value = Array.isArray(rawRedirect) ? rawRedirect[0] : rawRedirect;
  if (!value) {
    return undefined;
  }

  const decoded = decodeURIComponent(value);
  if (!decoded.startsWith("/") || decoded.startsWith("/login")) {
    return undefined;
  }
  return decoded;
}

function LayoutContent() {
  const { defaultRoute, hasActiveRole, hasAnyRole, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useGlobalSearchParams() as Record<string, string | string[] | undefined>;
  const redirectTarget = decodeRedirectTarget(searchParams.redirect);

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
      router.replace((redirectTarget ?? defaultRoute) as never);
      return;
    }

    if (pathname === "/" && defaultRoute !== "/") {
      router.replace(defaultRoute as never);
      return;
    }

    if (pathname.startsWith("/owner") && (!hasAnyRole("OWNER", "ADMIN") || !hasActiveRole("OWNER", "ADMIN"))) {
      router.replace(defaultRoute as never);
      return;
    }
    if (
      pathname.startsWith("/reception") &&
      (!hasAnyRole("RECEPTIONIST", "OWNER", "ADMIN") || !hasActiveRole("RECEPTIONIST", "OWNER", "ADMIN"))
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
  }, [defaultRoute, hasActiveRole, hasAnyRole, pathname, redirectTarget, router, searchParams, status]);

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
        <Stack.Screen name="profile" options={{ animation: "slide_from_left" }} />
        <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="membership" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="find-gyms" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="assistant" options={{ animation: "slide_from_right" }} />
        <Stack.Screen name="tracking-entry" options={{ animation: "slide_from_bottom" }} />
        <Stack.Screen name="tracking-history" options={{ animation: "slide_from_right" }} />
      </Stack>
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
});
