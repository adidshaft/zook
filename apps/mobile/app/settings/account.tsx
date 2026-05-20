import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Switch, Text } from "react-native";

import { GlassCard, ListRow, MobileHeader, ZookScreen } from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

export default function AccountSettingsScreen() {
  const { biometricEnabled, session, setBiometricEnabled } = useAuth();
  const { palette } = useTheme();
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="settings-account-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Account" subtitle="Your member identity" showProfileShortcut={false} />
          <GlassCard variant="compact" contentStyle={styles.list}>
            <ListRow title="Name" subtitle={session?.user.name ?? "Not set"} icon="person-outline" />
            <ListRow title="Email" subtitle={session?.user.email ?? "Not set"} icon="mail-outline" />
            <ListRow title="Phone" subtitle={session?.user.phone ?? "Not set"} icon="call-outline" />
          </GlassCard>
          <GlassCard variant="compact" contentStyle={styles.toggleRow}>
            <Text style={[styles.title, { color: palette.text.primary }]}>Biometric unlock</Text>
            <Switch value={biometricEnabled} onValueChange={(value) => void setBiometricEnabled(value)} />
          </GlassCard>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: 14, width: "100%" },
  list: { gap: 4 },
  toggleRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  title: typography.cardTitle,
});
