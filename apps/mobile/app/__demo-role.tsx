import { useLocalSearchParams, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { QA_TEST_OTP, type Role } from "@zook/core";
import { isOrgRole } from "@zook/core/permissions";

import { useAuth } from "@/lib/auth";
import { isOfflineDemoMode } from "@/lib/demo-mode";
import { routeForRole } from "@/lib/route-guards";
import { useTheme } from "@/lib/theme";

function safeTarget(value?: string | string[]) {
  const target = Array.isArray(value) ? value[0] : value;
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return null;
  }
  return target;
}

function seededEmailForRole(role: Role) {
  if (role === "PLATFORM_ADMIN") return "platform@zook.local";
  if (role === "OWNER") return "owner@zook.local";
  if (role === "ADMIN") return "admin@zook.local";
  if (role === "RECEPTIONIST") return "reception@zook.local";
  if (role === "TRAINER") return "trainer@zook.local";
  return "member@zook.local";
}

export default function DemoRoleSwitchRoute() {
  const { palette } = useTheme();
  const { role, target, reset } = useLocalSearchParams<{
    role?: string;
    target?: string;
    reset?: string;
  }>();
  const { requestOtp, resetQaSession, session, switchRole, verifyOtp } = useAuth();

  useEffect(() => {
    const nextRole = String(Array.isArray(role) ? role[0] : role ?? "").toUpperCase() as Role;
    const nextTarget = safeTarget(target) ?? routeForRole(nextRole);
    const shouldReset = String(Array.isArray(reset) ? reset[0] : reset ?? "") === "1";
    if (!nextRole) {
      router.replace("/" as never);
      return;
    }

    if (isOfflineDemoMode() && isOrgRole(nextRole)) {
      void switchRole(nextRole)
        .then(() => {
          router.replace(nextTarget as never);
        })
        .catch(() => {
          router.replace("/" as never);
        });
      return;
    }

    const email = seededEmailForRole(nextRole);
    const start = shouldReset ? resetQaSession().then(() => undefined) : Promise.resolve();
    void start
      .then(() => requestOtp(email))
      .then(() => verifyOtp(email, QA_TEST_OTP))
      .then(async () => {
        if (isOrgRole(nextRole)) {
          await switchRole(nextRole);
        }
      })
      .then(() => {
        router.replace(nextTarget as never);
      })
      .catch(() => {
        const fallbackRole = session?.user.isPlatformAdmin ? "/platform" : "/";
        router.replace(fallbackRole as never);
      });
  }, [
    requestOtp,
    reset,
    resetQaSession,
    role,
    session?.user.isPlatformAdmin,
    switchRole,
    target,
    verifyOtp,
  ]);

  return (
    <View
      testID="demo-role-switch-screen"
      style={[styles.container, { backgroundColor: palette.bg.app }]}
    >
      <ActivityIndicator color={palette.accent.base} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
});
