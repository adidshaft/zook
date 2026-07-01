import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Card,
  FormField,
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
  { titleKey: "settings.helpCenter", subtitleKey: "settings.helpCenterSubtitle", icon: "help-circle-outline", url: "https://zookfit.in/help" },
  { titleKey: "settings.terms", subtitleKey: "settings.termsSubtitle", icon: "document-text-outline", url: "https://zookfit.in/terms" },
  { titleKey: "settings.privacyPolicy", subtitleKey: "settings.privacyPolicySubtitle", icon: "shield-checkmark-outline", url: "https://zookfit.in/privacy" },
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
            showBack
          />
          <Card variant="compact" contentStyle={styles.list}>
            <Pressable
              onPress={() => setFeedbackOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityLabel={t("settings.reportProblem")}
              style={({ pressed }) => (pressed ? styles.rowPressed : null)}
            >
              <View style={styles.supportRow}>
                <View style={[styles.rowIcon, { backgroundColor: palette.surface.accentSoft }]}>
                  <Ionicons name="bug-outline" size={18} color={palette.accent.base} />
                </View>
                <View style={styles.rowCopy}>
                  <Text style={[styles.rowTitle, { color: palette.text.primary }]}>{t("settings.reportProblem")}</Text>
                  <Text style={[styles.rowBody, { color: palette.text.secondary }]} numberOfLines={1}>
                    {t("settings.reportProblemBody")}
                  </Text>
                </View>
                <Ionicons name={feedbackOpen ? "chevron-up" : "chevron-down"} size={18} color={palette.text.tertiary} />
              </View>
            </Pressable>
            {feedbackOpen ? (
              <View style={styles.feedbackForm}>
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
                <View style={styles.supportRow}>
                  <View style={[styles.rowIcon, { backgroundColor: palette.surface.default }]}>
                    <Ionicons name={row.icon} size={18} color={palette.text.secondary} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.rowTitle, { color: palette.text.primary }]}>{t(row.titleKey)}</Text>
                    <Text style={[styles.rowBody, { color: palette.text.secondary }]} numberOfLines={1}>
                      {t(row.subtitleKey)}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={17} color={palette.text.tertiary} />
                </View>
              </Pressable>
            ))}
          </Card>
          <View style={[styles.versionRail, { backgroundColor: palette.surface.default, borderColor: palette.border.subtle }]}>
            <Ionicons name="phone-portrait-outline" size={15} color={palette.text.tertiary} />
            <Text style={[styles.versionText, { color: palette.text.secondary }]} numberOfLines={1}>
              {t("settings.version", { version: appVersion })}
            </Text>
          </View>
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
  supportRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.md,
    minHeight: 56,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  rowIcon: { alignItems: "center", borderRadius: 14, height: 38, justifyContent: "center", width: 38 },
  rowCopy: { flex: 1, gap: 2, minWidth: 0 },
  rowTitle: typography.bodyStrong,
  rowBody: typography.small,
  versionRail: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  versionText: typography.small,
  rowPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
