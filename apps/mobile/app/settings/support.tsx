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
import { useT } from "@/lib/i18n";
import { useRoleContext } from "@/lib/role-context";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";
import { showToast } from "@/lib/toast";

const supportRows = [
  { titleKey: "settings.helpCenter", subtitleKey: "settings.helpCenterSubtitle", url: "https://zookfit.in/help" },
  { titleKey: "settings.terms", subtitleKey: "settings.termsSubtitle", url: "https://zookfit.in/terms" },
  { titleKey: "settings.privacyPolicy", subtitleKey: "settings.privacyPolicySubtitle", url: "https://zookfit.in/privacy" },
] as const;

export default function SupportSettingsScreen() {
  const { activeOrgId, token } = useAuth();
  const roleContext = useRoleContext();
  const { palette } = useTheme();
  const t = useT();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const appVersion = Constants.expoConfig?.version ?? Constants.nativeAppVersion ?? "dev";
  const role = roleContext?.role ?? "MEMBER";

  async function submitFeedback() {
    const message = feedback.trim();
    if (!token || message.length < 10) {
      showToast({
        title: t("settings.addFewDetails"),
        message: t("settings.supportDetailsPrompt"),
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
      showToast({ tone: "success", haptic: "success", message: t("settings.reportSent") });
    } catch (error) {
      showToast({
        title: t("settings.couldNotSendReport"),
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
            title={t("member.you.helpSupport")}
            subtitle={t("settings.version", { version: Constants.expoConfig?.version ?? "dev" })}
            showBack
          />
          <Card variant="compact" contentStyle={styles.list}>
            <Pressable
              onPress={() => setFeedbackOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel={t("settings.reportProblem")}
              style={({ pressed }) => (pressed ? styles.rowPressed : null)}
            >
              <ListRow
                title={t("settings.reportProblem")}
                icon="bug-outline"
                style={styles.row}
              />
            </Pressable>
            {feedbackOpen ? (
              <View style={styles.feedbackForm}>
                <Text style={[styles.body, { color: palette.text.secondary }]}>
                  {t("settings.reportProblemBody")}
                </Text>
                <FormField
                  label={t("settings.problemDetails")}
                  value={feedback}
                  onChangeText={setFeedback}
                  multiline
                  textAlignVertical="top"
                  numberOfLines={5}
                  maxLength={2_000}
                  placeholder={t("settings.problemDetailsPlaceholder")}
                  hint={t("settings.supportContext", {
                    role,
                    gym: roleContext?.org?.name ?? t("settings.noActiveGym"),
                    version: appVersion,
                  })}
                />
                <ZookButton onPress={() => void submitFeedback()} busy={busy} disabled={busy}>
                  {t("settings.sendReport")}
                </ZookButton>
              </View>
            ) : null}
            {supportRows.map((row) => (
              <Pressable
                key={row.titleKey}
                onPress={() => void Linking.openURL(row.url)}
                accessibilityRole="button"
                accessibilityLabel={t(row.titleKey)}
                style={({ pressed }) => (pressed ? styles.rowPressed : null)}
              >
                <ListRow
                  title={t(row.titleKey)}
                  subtitle={t(row.subtitleKey)}
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
    paddingTop: layout.screenContentTopPadding,
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
