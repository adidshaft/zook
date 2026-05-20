import { useQueryClient } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";

import { GlassCard, MobileHeader, ZookScreen } from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { notificationsApi } from "@/lib/domain-api";
import { mergeNotificationPreferences } from "@/lib/notification-preferences";
import { useMyNotificationPreferences } from "@/lib/domains";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

const rows = [
  { key: "transactional", title: "Payments and receipts" },
  { key: "operational", title: "Gym operations" },
  { key: "engagement", title: "Training reminders" },
  { key: "promotional", title: "Offers" },
] as const;

export default function NotificationSettingsScreen() {
  const { activeOrgId, token } = useAuth();
  const queryClient = useQueryClient();
  const query = useMyNotificationPreferences();
  const { palette } = useTheme();
  const preferences = mergeNotificationPreferences(query.data?.preferences, activeOrgId);

  async function update(key: (typeof rows)[number]["key"] | "pushEnabled", value: boolean) {
    if (!token) return;
    try {
      await notificationsApi.updatePreferences({ token, ...(activeOrgId ? { orgId: activeOrgId } : {}), preferences: { ...(activeOrgId ? { orgId: activeOrgId } : {}), [key]: value } });
      await queryClient.invalidateQueries({ queryKey: ["me", "notification-preferences"] });
    } catch (error) {
      console.warn(getApiErrorMessage(error));
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="settings-notifications-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Notifications" subtitle="Choose what Zook can send" showProfileShortcut={false} />
          <GlassCard variant="compact" contentStyle={styles.stack}>
            <PreferenceRow title="Push notifications" value={preferences.pushEnabled} onChange={(value) => void update("pushEnabled", value)} />
            {rows.map((row) => (
              <PreferenceRow key={row.key} title={row.title} value={preferences[row.key]} onChange={(value) => void update(row.key, value)} />
            ))}
          </GlassCard>
          <Text style={[styles.note, { color: palette.text.secondary }]}>Changes sync to your active gym when available.</Text>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

function PreferenceRow({ onChange, title, value }: { onChange: (value: boolean) => void; title: string; value: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={styles.row}>
      <Text style={[styles.title, { color: palette.text.primary }]}>{title}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: 14, width: "100%" },
  stack: { gap: spacing.md },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 48 },
  title: typography.cardTitle,
  note: typography.small,
});
