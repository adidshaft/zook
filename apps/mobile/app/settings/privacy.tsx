import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";

import { Card, AppHeader, ZookButton, ZookScreen } from "@/components/primitives";
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
            <Text style={[styles.body, { color: palette.text.secondary }]}>{t("settings.privacyRequestBody")}</Text>
            <ZookButton onPress={() => void requestExport()} variant="secondary" disabled={exportBusy}>{t("settings.requestDataExport")}</ZookButton>
            <ZookButton onPress={confirmDeletionRequest} variant="destructive" disabled={deletionBusy}>{t("settings.requestAccountDeletion")}</ZookButton>
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
  body: typography.body,
});
