import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Card, AppHeader, ZookScreen } from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { privacyApi } from "@/lib/domain-api";
import { useT } from "@/lib/i18n";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import { showToast } from "@/lib/toast";

export default function PrivacySettingsScreen() {
  const { token } = useAuth();
  const { palette } = useTheme();
  const t = useT();
  const [exportBusy, setExportBusy] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);

  async function requestExport() {
    if (!token) return;
    setExportBusy(true);
    try {
      await privacyApi.requestDataExport({ token });
      showToast({ tone: "success", haptic: "success", message: t("settings.exportRequested") });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.noExport");
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
    } finally {
      setExportBusy(false);
    }
  }

  async function requestDeletion() {
    if (!token) return;
    setDeletionBusy(true);
    try {
      await privacyApi.requestAccountDeletion({ token });
      showToast({ tone: "success", haptic: "success", message: t("settings.deletionRequested") });
    } catch (error) {
      const message = error instanceof Error ? error.message : t("settings.noDeletion");
      showToast({ title: t("common.actionFailed"), message, tone: "danger", haptic: "error" });
    } finally {
      setDeletionBusy(false);
    }
  }

  function confirmDeletionRequest() {
    Alert.alert(
      t("settings.deleteConfirmTitle"),
      t("settings.deleteConfirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        { text: t("settings.requestDeletion"), style: "destructive", onPress: () => void requestDeletion() },
      ],
    );
  }

  return (
    <>
      <ZookScreen testID="settings-privacy-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <AppHeader title={t("member.you.privacy")} showBack />
          <Card variant="compact" contentStyle={styles.stack}>
            <View style={styles.introRow}>
              <View style={[styles.introIcon, { backgroundColor: palette.surface.accentSoft }]}>
                <Ionicons name="shield-checkmark-outline" size={17} color={palette.accent.base} />
              </View>
              <Text style={[styles.noteText, { color: palette.text.secondary }]} numberOfLines={2}>
                {t("settings.privacyRequestBody")}
              </Text>
            </View>
            <View style={styles.actionList}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("settings.requestDataExport")}
                disabled={exportBusy}
                onPress={() => void requestExport()}
                style={({ pressed }) => [
                  styles.actionRow,
                  { backgroundColor: palette.surface.default, borderColor: palette.border.subtle },
                  pressed ? styles.pressed : null,
                  exportBusy ? styles.disabled : null,
                ]}
              >
                <View style={[styles.actionIcon, { backgroundColor: palette.surface.default }]}>
                  <Ionicons name={exportBusy ? "hourglass-outline" : "download-outline"} size={17} color={palette.text.secondary} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={[styles.actionTitle, { color: palette.text.primary }]} numberOfLines={1}>
                    {t("settings.requestDataExport")}
                  </Text>
                  <Text style={[styles.actionBody, { color: palette.text.secondary }]} numberOfLines={1}>
                    {t("settings.export")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("settings.requestAccountDeletion")}
                disabled={deletionBusy}
                onPress={confirmDeletionRequest}
                style={({ pressed }) => [
                  styles.actionRow,
                  styles.dangerRow,
                  { backgroundColor: palette.surface.dangerSoft, borderColor: palette.feedback.danger },
                  pressed ? styles.pressed : null,
                  deletionBusy ? styles.disabled : null,
                ]}
              >
                <View style={[styles.actionIcon, { backgroundColor: palette.surface.default }]}>
                  <Ionicons name={deletionBusy ? "hourglass-outline" : "trash-outline"} size={17} color={palette.feedback.danger} />
                </View>
                <View style={styles.actionCopy}>
                  <Text style={[styles.actionTitle, { color: palette.text.primary }]} numberOfLines={1}>
                    {t("settings.requestAccountDeletion")}
                  </Text>
                  <Text style={[styles.actionBody, { color: palette.text.secondary }]} numberOfLines={2}>
                    {t("settings.privacyWarning")}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />
              </Pressable>
            </View>
          </Card>
        </ScrollView>
      </ZookScreen>
    </>
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
  stack: { gap: spacing.md },
  actionList: { gap: spacing.xs },
  actionRow: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 58,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
  },
  dangerRow: { borderWidth: 1 },
  actionIcon: { alignItems: "center", borderRadius: 13, height: 34, justifyContent: "center", width: 34 },
  actionCopy: { flex: 1, gap: 2, minWidth: 0 },
  actionTitle: typography.bodyStrong,
  actionBody: typography.small,
  introRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  introIcon: {
    alignItems: "center",
    borderRadius: 13,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  noteText: { ...typography.small, flex: 1 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.52 },
});
