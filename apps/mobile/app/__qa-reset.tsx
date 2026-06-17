import { useLocalSearchParams, router } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/lib/auth";
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
  const { target } = useLocalSearchParams<{ target?: string }>();
  const { resetQaSession } = useAuth();

  useEffect(() => {
    const nextTarget = safeTarget(target);
    void resetQaSession()
      .then(() => {
        router.replace(nextTarget as never);
      })
      .catch(() => {
        router.replace("/login" as never);
      });
  }, [resetQaSession, target]);

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
