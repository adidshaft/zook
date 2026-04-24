import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useGlobalSearchParams, usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth";
import { PushNotificationsProvider } from "@/lib/push-notifications";
import { colors } from "@/lib/theme";

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
  const { defaultRoute, hasAnyRole, status } = useAuth();
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

    if (pathname.startsWith("/owner") && !hasAnyRole("OWNER", "ADMIN")) {
      router.replace(defaultRoute as never);
      return;
    }
    if (pathname.startsWith("/reception") && !hasAnyRole("RECEPTIONIST", "OWNER", "ADMIN")) {
      router.replace(defaultRoute as never);
      return;
    }
    if (pathname.startsWith("/trainer") && !hasAnyRole("TRAINER", "OWNER", "ADMIN")) {
      router.replace(defaultRoute as never);
    }
  }, [defaultRoute, hasAnyRole, pathname, redirectTarget, router, searchParams, status]);

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
          headerStyle: { backgroundColor: "#070908" },
          headerTintColor: "#f4f7ef",
          contentStyle: { backgroundColor: "#070908" },
        }}
      />
    </>
  );
}

export default function Layout() {
  const [queryClient] = useState(() => new QueryClient());

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
