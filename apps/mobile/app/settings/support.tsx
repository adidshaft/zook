import Constants from "expo-constants";
import { Stack } from "expo-router";
import { Linking, Pressable, ScrollView, StyleSheet } from "react-native";

import { GlassCard, ListRow, MobileHeader, ZookScreen } from "@/components/primitives";
import { layout, spacing } from "@/lib/theme";

const supportRows = [
  { title: "Help center", subtitle: "Open zookfit.in/help", url: "https://zookfit.in/help" },
  { title: "Contact", subtitle: "Email support", url: "mailto:support@zookfit.in" },
  { title: "Terms", subtitle: "View terms of service", url: "https://zookfit.in/terms" },
  { title: "Privacy Policy", subtitle: "View privacy policy", url: "https://zookfit.in/privacy" },
] as const;

export default function SupportSettingsScreen() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="settings-support-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Help & support" subtitle={`Version ${Constants.expoConfig?.version ?? "dev"}`} showProfileShortcut={false} />
          <GlassCard variant="compact" contentStyle={styles.list}>
            {supportRows.map((row) => (
              <Pressable
                key={row.title}
                onPress={() => void Linking.openURL(row.url)}
                accessibilityRole="button"
                accessibilityLabel={row.title}
                style={({ pressed }) => (pressed ? styles.rowPressed : null)}
              >
                <ListRow title={row.title} subtitle={row.subtitle} icon="help-circle-outline" style={styles.row} />
              </Pressable>
            ))}
          </GlassCard>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: 14, width: "100%" },
  list: { gap: 4 },
  row: {},
  rowPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
