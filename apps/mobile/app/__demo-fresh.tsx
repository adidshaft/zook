import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";

import { setDemoFreshGym } from "@/lib/demo-api";
import { isOfflineDemoEnabled } from "@/lib/runtime-mode";
import { useTheme } from "@/lib/theme";

/**
 * QA / sales-demo helper: toggle "fresh gym" mode (a brand-new gym with no
 * members, plans, classes, or activity) so the empty/onboarding states are
 * visible. e.g. exp://…/--/__demo-fresh?on=1&target=/owner
 */
function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default function DemoFreshGymRoute() {
  const { palette } = useTheme();
  const queryClient = useQueryClient();
  const { on, target } = useLocalSearchParams<{ on?: string; target?: string }>();
  const demoEnabled = isOfflineDemoEnabled();

  useEffect(() => {
    if (!demoEnabled) {
      router.replace("/" as never);
      return;
    }
    setDemoFreshGym(firstParam(on) !== "0");
    void queryClient.invalidateQueries().finally(() => {
      const next = firstParam(target);
      router.replace((next && next.startsWith("/") ? next : "/owner") as never);
    });
  }, [demoEnabled, on, queryClient, target]);

  if (!demoEnabled) {
    return <Redirect href="/" />;
  }

  return (
    <View style={[styles.container, { backgroundColor: palette.bg.app }]}>
      <ActivityIndicator color={palette.accent.base} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", flex: 1, justifyContent: "center" },
});
