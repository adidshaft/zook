import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { MobileHeader, ZookButton, ZookScreen } from "@/components/primitives";
import { getMobileWebBaseUrl } from "@/lib/api";
import { colors, layout, spacing, typography } from "@/lib/theme";

export default function DashboardWebBridge() {
  const router = useRouter();
  const dashboardUrl = `${getMobileWebBaseUrl()}/dashboard`;

  useEffect(() => {
    void Linking.openURL(dashboardUrl).finally(() => {
      router.replace("/owner" as never);
    });
  }, [dashboardUrl, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <View style={styles.content}>
          <MobileHeader title="Dashboard" subtitle="Opening web management" />
          <View style={styles.panel}>
            <Text style={styles.title}>Open the web dashboard</Text>
            <Text style={styles.body}>
              Owner management tools live on the web dashboard. Zook is opening it now.
            </Text>
            <ZookButton onPress={() => void Linking.openURL(dashboardUrl)} icon="open-outline">
              Open dashboard
            </ZookButton>
          </View>
        </View>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    paddingBottom: 40,
    gap: spacing.md,
  },
  panel: {
    gap: spacing.md,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    ...typography.h2,
  },
  body: {
    color: colors.muted,
    ...typography.body,
  },
});
