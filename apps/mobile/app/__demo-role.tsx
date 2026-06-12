import { useLocalSearchParams, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
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

export default function DemoRoleSwitchRoute() {
  const { palette } = useTheme();
  const { role, target } = useLocalSearchParams<{ role?: string; target?: string }>();
  const { switchRole } = useAuth();

  useEffect(() => {
    const nextRole = String(Array.isArray(role) ? role[0] : role ?? "").toUpperCase();
    if (!isOfflineDemoMode() || !isOrgRole(nextRole)) {
      router.replace("/" as never);
      return;
    }

    void switchRole(nextRole)
      .then(() => {
        router.replace((safeTarget(target) ?? routeForRole(nextRole)) as never);
      })
      .catch(() => {
        router.replace("/" as never);
      });
  }, [role, switchRole, target]);

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
