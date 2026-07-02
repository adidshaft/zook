import { Redirect, useLocalSearchParams, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/lib/auth";
import { isMobileFeatureEnabled, isOfflineDemoEnabled } from "@/lib/runtime-mode";
import { useTheme } from "@/lib/theme";

function safeTarget(value?: string | string[]) {
  const target = Array.isArray(value) ? value[0] : value;
  if (!target || !target.startsWith("/") || target.startsWith("//")) {
    return "/login";
  }
  return target;
}

export default function QaResetRoute() {
  const { palette } = useTheme();
  const demoEnabled = isOfflineDemoEnabled();
  const qaShortcutsEnabled = demoEnabled && __DEV__ && isMobileFeatureEnabled("QA_SHORTCUTS_ENABLED");
  const { target } = useLocalSearchParams<{ target?: string }>();
  const { resetQaSession } = useAuth();

  useEffect(() => {
    if (!demoEnabled || !qaShortcutsEnabled) {
      return;
    }
    const nextTarget = safeTarget(target);
    void resetQaSession()
      .then(() => {
        router.replace(nextTarget as never);
      })
      .catch(() => {
        router.replace("/login" as never);
      });
  }, [demoEnabled, qaShortcutsEnabled, resetQaSession, target]);

  if (!demoEnabled || !qaShortcutsEnabled) {
    return <Redirect href="/" />;
  }

  return (
    <View testID="qa-reset-screen" style={[styles.container, { backgroundColor: palette.bg.app }]}>
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
