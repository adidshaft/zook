import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, AppHeader, ThemedSwitch, ZookScreen } from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { notificationsApi } from "@/lib/domain-api";
import { useT } from "@/lib/i18n";
import { mergeNotificationPreferences } from "@/lib/notification-preferences";
import { useMyNotificationPreferences } from "@/lib/domains";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import { showToast } from "@/lib/toast";

const rows = [
  { key: "transactional", titleKey: "settings.paymentsReceipts", subtitleKey: "settings.paymentsReceiptsSubtitle", icon: "receipt-outline" },
  { key: "operational", titleKey: "settings.gymOperations", subtitleKey: "settings.gymOperationsSubtitle", icon: "business-outline" },
  { key: "engagement", titleKey: "settings.trainingReminders", subtitleKey: "settings.trainingRemindersSubtitle", icon: "barbell-outline" },
  { key: "promotional", titleKey: "settings.offers", subtitleKey: "settings.offersSubtitle", icon: "pricetag-outline" },
] as const;

export default function NotificationSettingsScreen() {
  const { activeOrgId, token } = useAuth();
  const queryClient = useQueryClient();
  const query = useMyNotificationPreferences();
  const { palette } = useTheme();
  const t = useT();
  const preferences = mergeNotificationPreferences(query.data?.preferences, activeOrgId);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  async function update(key: (typeof rows)[number]["key"] | "pushEnabled", value: boolean) {
    if (!token) return;
    setPendingKey(key);
    try {
      await notificationsApi.updatePreferences({ token, ...(activeOrgId ? { orgId: activeOrgId } : {}), preferences: { ...(activeOrgId ? { orgId: activeOrgId } : {}), [key]: value } });
      await queryClient.invalidateQueries({ queryKey: ["me", "notification-preferences"] });
      showToast({ tone: "success", haptic: "success", message: t("settings.preferencesUpdated") });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.preferenceNotSaved");
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
      await queryClient.invalidateQueries({ queryKey: ["me", "notification-preferences"] });
    } finally {
      setPendingKey(null);
    }
  }

  return (
    <>
      <ZookScreen testID="settings-notifications-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <AppHeader title={t("settings.notifications")} showBack />
          <Card variant="compact" contentStyle={styles.stack}>
            <PreferenceRow
              icon="notifications-outline"
              subtitle={t("settings.pushNotificationsSubtitle")}
              title={t("settings.pushNotifications")}
              value={preferences.pushEnabled}
              disabled={pendingKey === "pushEnabled"}
              onChange={(value) => void update("pushEnabled", value)}
            />
            {rows.map((row) => (
              <PreferenceRow
                key={row.key}
                icon={row.icon}
                subtitle={t(row.subtitleKey)}
                title={t(row.titleKey)}
                value={preferences[row.key]}
                disabled={pendingKey === row.key}
                onChange={(value) => void update(row.key, value)}
              />
            ))}
          </Card>
          <View style={[styles.noteRail, { borderColor: palette.border.subtle, backgroundColor: palette.surface.default }]}>
            <Ionicons name="business-outline" size={14} color={palette.text.secondary} />
            <Text style={[styles.note, { color: palette.text.secondary }]} numberOfLines={2}>
              {t("settings.activeGymPreferenceNote")}
            </Text>
          </View>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

function PreferenceRow({
  disabled,
  icon,
  onChange,
  subtitle,
  title,
  value,
}: {
  disabled?: boolean;
  icon: keyof typeof Ionicons.glyphMap;
  onChange: (value: boolean) => void;
  subtitle: string;
  title: string;
  value: boolean;
}) {
  const { palette } = useTheme();
  return (
    <View style={[styles.row, disabled ? styles.rowDisabled : null]}>
      <View style={[styles.iconBox, { backgroundColor: palette.surface.default }]}>
        <Ionicons name={icon} size={18} color={palette.text.secondary} />
      </View>
      <View style={styles.copy}>
        <Text style={[styles.title, { color: palette.text.primary }]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.subtitle, { color: palette.text.secondary }]} numberOfLines={2}>{subtitle}</Text>
      </View>
      <ThemedSwitch value={value} disabled={disabled} onValueChange={onChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  stack: { gap: spacing.xs },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.sm, minHeight: 52 },
  rowDisabled: { opacity: 0.68 },
  iconBox: { alignItems: "center", borderRadius: 12, height: 34, justifyContent: "center", width: 34 },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  title: typography.bodyStrong,
  subtitle: typography.small,
  noteRail: {
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  note: { ...typography.small, flex: 1, minWidth: 0 },
});
