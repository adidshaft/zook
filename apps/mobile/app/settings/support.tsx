import { useState } from "react";
import Constants from "expo-constants";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Card,
  FormField,
  ListRow,
  AppHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { supportApi } from "@/lib/domain-api";
import { useRoleContext } from "@/lib/role-context";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import { showToast } from "@/lib/toast";

const supportRows = [
  { title: "Help center", subtitle: "Open zookfit.in/help", url: "https://zookfit.in/help" },
  { title: "Terms", subtitle: "View terms of service", url: "https://zookfit.in/terms" },
  { title: "Privacy Policy", subtitle: "View privacy policy", url: "https://zookfit.in/privacy" },
] as const;

export default function SupportSettingsScreen() {
  const { activeOrgId, token } = useAuth();
  const roleContext = useRoleContext();
  const { palette } = useTheme();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "dev";
  const role = roleContext?.role ?? "MEMBER";

  async function submitFeedback() {
    const message = feedback.trim();
    if (!token || message.length < 10) {
      showToast({
        title: "Add a few details",
        message: "Tell us what went wrong so support can follow up.",
        tone: "amber",
        haptic: "warning",
      });
      return;
    }
    setBusy(true);
    try {
      await supportApi.submitFeedback({
        token,
        orgId: activeOrgId ?? roleContext?.org?.orgId,
        message,
        appVersion,
        role,
      });
      setFeedback("");
      setFeedbackOpen(false);
      showToast({ tone: "success", haptic: "success", message: "Report sent to support." });
    } catch (error) {
      showToast({
        title: "Could not send report",
        message: getApiErrorMessage(error),
        tone: "danger",
        haptic: "error",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <ZookScreen testID="settings-support-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <AppHeader
            title="Help & support"
            subtitle={`Version ${Constants.expoConfig?.version ?? "dev"}`}
            showProfileShortcut={false}
            showBack
          />
          <Card variant="compact" contentStyle={styles.list}>
            <Pressable
              onPress={() => setFeedbackOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel="Report a problem"
              style={({ pressed }) => (pressed ? styles.rowPressed : null)}
            >
              <ListRow
                title="Report a problem"
                subtitle="Send app details to Zook support"
                icon="bug-outline"
                style={styles.row}
              />
            </Pressable>
            {feedbackOpen ? (
              <View style={styles.feedbackForm}>
                <Text style={[styles.body, { color: palette.text.secondary }]}>
                  Include the issue, what you expected, and what happened.
                </Text>
                <FormField
                  label="Problem details"
                  value={feedback}
                  onChangeText={setFeedback}
                  multiline
                  textAlignVertical="top"
                  numberOfLines={5}
                  maxLength={2_000}
                  placeholder="I was trying to..."
                  hint={`${role} · ${roleContext?.org?.name ?? "No gym selected"} · ${appVersion}`}
                />
                <ZookButton onPress={() => void submitFeedback()} busy={busy} disabled={busy}>
                  Send report
                </ZookButton>
              </View>
            ) : null}
            {supportRows.map((row) => (
              <Pressable
                key={row.title}
                onPress={() => void Linking.openURL(row.url)}
                accessibilityRole="button"
                accessibilityLabel={row.title}
                style={({ pressed }) => (pressed ? styles.rowPressed : null)}
              >
                <ListRow
                  title={row.title}
                  subtitle={row.subtitle}
                  icon="help-circle-outline"
                  style={styles.row}
                />
              </Pressable>
            ))}
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
    paddingTop: 14,
    width: "100%",
  },
  body: typography.body,
  feedbackForm: { gap: spacing.md, paddingBottom: spacing.sm },
  list: { gap: 4 },
  row: {},
  rowPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
