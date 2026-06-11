import { useState } from "react";
import { Alert, ScrollView, StyleSheet, Text } from "react-native";

import { Card, MobileHeader, ZookButton, ZookScreen } from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { privacyApi } from "@/lib/domain-api";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import { showToast } from "@/lib/toast";

export default function PrivacySettingsScreen() {
  const { token } = useAuth();
  const { palette } = useTheme();
  const [exportBusy, setExportBusy] = useState(false);
  const [deletionBusy, setDeletionBusy] = useState(false);

  async function requestExport() {
    if (!token) return;
    setExportBusy(true);
    try {
      await privacyApi.requestDataExport({ token });
      showToast({ tone: "success", haptic: "success", message: "Data export requested." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to request data export.";
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
    } finally {
      setExportBusy(false);
    }
  }

  async function requestDeletion() {
    if (!token) return;
    setDeletionBusy(true);
    try {
      await privacyApi.requestAccountDeletion({ token });
      showToast({ tone: "success", haptic: "success", message: "Account deletion request started." });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to request account deletion.";
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
    } finally {
      setDeletionBusy(false);
    }
  }

  function confirmDeletionRequest() {
    Alert.alert(
      "Request account deletion?",
      "Zook support will review this request before any account data is removed.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Request deletion", style: "destructive", onPress: () => void requestDeletion() },
      ],
    );
  }

  return (
    <>
      <ZookScreen testID="settings-privacy-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Privacy" subtitle="Your data controls" showProfileShortcut={false} />
          <Card variant="compact" contentStyle={styles.stack}>
            <Text style={[styles.body, { color: palette.text.secondary }]}>Request a copy of your Zook data or start an account deletion request.</Text>
            <ZookButton onPress={() => void requestExport()} variant="secondary" disabled={exportBusy}>Request data export</ZookButton>
            <ZookButton onPress={confirmDeletionRequest} variant="destructive" disabled={deletionBusy}>Request account deletion</ZookButton>
          </Card>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: 14, width: "100%" },
  stack: { gap: spacing.md },
  body: typography.body,
});
