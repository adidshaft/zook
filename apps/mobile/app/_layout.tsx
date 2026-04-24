import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { usePathname, useRouter } from "expo-router";
import { Stack } from "expo-router/stack";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { AuthProvider, useAuth } from "@/lib/auth";
import { colors } from "@/lib/theme";

function LayoutContent() {
  const { defaultRoute, hasAnyRole, status } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (status === "loading") {
      return;
    }
    if (status === "unauthenticated") {
      if (pathname !== "/login") {
        router.replace("/login");
      }
      return;
    }

    if (pathname === "/login") {
      router.replace(defaultRoute as never);
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
  }, [defaultRoute, hasAnyRole, pathname, router, status]);

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
          contentStyle: { backgroundColor: "#070908" }
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
        <LayoutContent />
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
    gap: 12
  },
  loadingText: {
    color: colors.text,
    fontSize: 14
  }
});
