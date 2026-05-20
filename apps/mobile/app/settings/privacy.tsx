import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text } from "react-native";

import { GlassCard, MobileHeader, ZookButton, ZookScreen } from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { privacyApi } from "@/lib/domain-api";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

export default function PrivacySettingsScreen() {
  const { token } = useAuth();
  const { palette } = useTheme();

  async function requestExport() {
    if (!token) return;
    await privacyApi.requestDataExport({ token }).catch((error) => console.warn(getApiErrorMessage(error)));
  }

  async function requestDeletion() {
    if (!token) return;
    await privacyApi.requestAccountDeletion({ token }).catch((error) => console.warn(getApiErrorMessage(error)));
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="settings-privacy-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Privacy" subtitle="Your data controls" showProfileShortcut={false} />
          <GlassCard variant="compact" contentStyle={styles.stack}>
            <Text style={[styles.body, { color: palette.text.secondary }]}>Request a copy of your Zook data or start an account deletion request.</Text>
            <ZookButton onPress={requestExport} tone="secondary">Request data export</ZookButton>
            <ZookButton onPress={requestDeletion} tone="danger">Request account deletion</ZookButton>
          </GlassCard>
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
