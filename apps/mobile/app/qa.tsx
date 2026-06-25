import { Redirect, router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { Role } from "@zook/core";

import { AppHeader, Card, ZookButton, ZookScreen } from "@/components/primitives";
import type { TranslationKey } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";
import { isMobileFeatureEnabled } from "@/lib/runtime-mode";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

type RoleShortcut = {
  labelKey: TranslationKey;
  role: Role;
  target: string;
  view?: string;
  testID: string;
};

const publicShortcuts = [
  { labelKey: "qa.login", href: "/login", testID: "qa-public-login" },
  { labelKey: "qa.gyms", href: "/gyms", testID: "qa-public-gyms" },
  { labelKey: "qa.aarogyaGym", href: "/gyms/aarogya-strength", testID: "qa-public-gym-aarogya" },
  { labelKey: "settings.language", href: "/onboarding/language", testID: "qa-public-language" },
  { labelKey: "qa.valueProps", href: "/onboarding/value-props", testID: "qa-public-value-props" },
] as const satisfies ReadonlyArray<{ labelKey: TranslationKey; href: string; testID: string }>;

const roleShortcuts: readonly RoleShortcut[] = [
  { labelKey: "qa.memberHome", role: "MEMBER", target: "/", testID: "qa-member-home" },
  { labelKey: "qa.memberProgress", role: "MEMBER", target: "/progress", testID: "qa-member-progress" },
  { labelKey: "qa.memberScan", role: "MEMBER", target: "/scan", testID: "qa-member-scan" },
  { labelKey: "qa.memberPlan", role: "MEMBER", target: "/plan", testID: "qa-member-plan" },
  { labelKey: "qa.memberMembership", role: "MEMBER", target: "/membership", testID: "qa-member-membership" },
  { labelKey: "qa.memberClasses", role: "MEMBER", target: "/classes", testID: "qa-member-classes" },
  { labelKey: "qa.memberShop", role: "MEMBER", target: "/__qa-open?kind=member-shop", testID: "qa-member-shop" },
  { labelKey: "qa.memberAssistant", role: "MEMBER", target: "/assistant", testID: "qa-member-assistant" },
  { labelKey: "qa.memberNotifications", role: "MEMBER", target: "/notifications", testID: "qa-member-notifications" },
  { labelKey: "qa.memberHistory", role: "MEMBER", target: "/tracking-history", testID: "qa-member-history" },
  { labelKey: "qa.memberTrackingEntry", role: "MEMBER", target: "/tracking-entry", testID: "qa-member-tracking-entry" },
  { labelKey: "qa.memberAttendanceDetail", role: "MEMBER", target: "/__qa-open?kind=member-attendance-detail", testID: "qa-member-attendance-detail" },
  { labelKey: "qa.ownerHome", role: "OWNER", target: "/owner", testID: "qa-owner-home" },
  { labelKey: "qa.ownerMembers", role: "OWNER", target: "/owner/members", testID: "qa-owner-members" },
  { labelKey: "qa.ownerMemberDetail", role: "OWNER", target: "/__qa-open?kind=owner-member-detail", testID: "qa-owner-member-detail" },
  { labelKey: "qa.ownerApprovals", role: "OWNER", target: "/owner/approvals", testID: "qa-owner-approvals" },
  { labelKey: "qa.ownerRevenue", role: "OWNER", target: "/owner/revenue", testID: "qa-owner-revenue" },
  { labelKey: "qa.ownerStock", role: "OWNER", target: "/owner/stock", testID: "qa-owner-stock" },
  { labelKey: "qa.ownerBilling", role: "OWNER", target: "/owner/billing", testID: "qa-owner-billing" },
  { labelKey: "qa.ownerMore", role: "OWNER", target: "/owner/more", testID: "qa-owner-more" },
  { labelKey: "qa.ownerNotifications", role: "OWNER", target: "/notifications", testID: "qa-owner-notifications" },
  { labelKey: "qa.adminHome", role: "ADMIN", target: "/owner", testID: "qa-admin-home" },
  { labelKey: "qa.adminApprovals", role: "ADMIN", target: "/owner/approvals", testID: "qa-admin-approvals" },
  { labelKey: "qa.adminStock", role: "ADMIN", target: "/owner/stock", testID: "qa-admin-stock" },
  { labelKey: "qa.adminMore", role: "ADMIN", target: "/owner/more", testID: "qa-admin-more" },
  { labelKey: "qa.trainerHome", role: "TRAINER", target: "/trainer", view: "home", testID: "qa-trainer-home" },
  { labelKey: "qa.trainerClients", role: "TRAINER", target: "/trainer", view: "clients", testID: "qa-trainer-clients" },
  { labelKey: "qa.trainerPlans", role: "TRAINER", target: "/trainer", view: "plans", testID: "qa-trainer-plans" },
  { labelKey: "qa.trainerPayouts", role: "TRAINER", target: "/trainer", view: "payouts", testID: "qa-trainer-payouts" },
  { labelKey: "qa.trainerClientDetail", role: "TRAINER", target: "/__qa-open?kind=trainer-client-detail", testID: "qa-trainer-client-detail" },
  { labelKey: "qa.trainerClientPlan", role: "TRAINER", target: "/__qa-open?kind=trainer-client-plan", testID: "qa-trainer-client-plan" },
  { labelKey: "qa.trainerClientSessions", role: "TRAINER", target: "/__qa-open?kind=trainer-client-sessions", testID: "qa-trainer-client-sessions" },
  { labelKey: "qa.receptionHome", role: "RECEPTIONIST", target: "/reception", testID: "qa-reception-home" },
  { labelKey: "qa.receptionMembers", role: "RECEPTIONIST", target: "/reception/members", testID: "qa-reception-members" },
  { labelKey: "qa.receptionMemberDetail", role: "RECEPTIONIST", target: "/__qa-open?kind=reception-member-detail", testID: "qa-reception-member-detail" },
  { labelKey: "qa.receptionPayments", role: "RECEPTIONIST", target: "/reception/payments", testID: "qa-reception-payments" },
  { labelKey: "qa.receptionOrders", role: "RECEPTIONIST", target: "/reception/orders", testID: "qa-reception-orders" },
  { labelKey: "qa.receptionScan", role: "RECEPTIONIST", target: "/scan", testID: "qa-reception-scan" },
  { labelKey: "qa.receptionVerification", role: "RECEPTIONIST", target: "/__qa-open?kind=reception-verification", testID: "qa-reception-verification" },
] as const;

function launchRoleShortcut(shortcut: RoleShortcut) {
  const query = new URLSearchParams({
    role: shortcut.role,
    target: shortcut.target,
    ...(shortcut.view ? { view: shortcut.view } : {}),
  }).toString();
  router.replace((`/__qa-role?${query}`) as never);
}

export default function QaLauncherScreen() {
  const { palette } = useTheme();
  const { t } = useI18n();
  const qaShortcutsEnabled = __DEV__ && isMobileFeatureEnabled("QA_SHORTCUTS_ENABLED");
  const visibleRoleShortcuts = isMobileFeatureEnabled("AI_CHAT_ENABLED")
    ? roleShortcuts
    : roleShortcuts.filter((shortcut) => shortcut.target !== "/assistant");

  if (!qaShortcutsEnabled) {
    return <Redirect href="/login" />;
  }

  return (
    <ZookScreen testID="qa-launcher-screen">
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <AppHeader
          title={t("qa.title")}
          showBack
        />

        <Card contentStyle={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{t("qa.public")}</Text>
          <View style={styles.grid}>
            {publicShortcuts.map((shortcut) => (
              <ZookButton
                key={shortcut.testID}
                testID={shortcut.testID}
                variant="secondary"
                onPress={() => router.replace(shortcut.href as never)}
              >
                {t(shortcut.labelKey)}
              </ZookButton>
            ))}
          </View>
        </Card>

        <Card contentStyle={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{t("qa.roles")}</Text>
          <View style={styles.grid}>
            {visibleRoleShortcuts.map((shortcut) => (
              <ZookButton
                key={shortcut.testID}
                testID={shortcut.testID}
                variant="secondary"
                onPress={() => launchRoleShortcut(shortcut)}
              >
                {t(shortcut.labelKey)}
              </ZookButton>
            ))}
          </View>
        </Card>
      </ScrollView>
    </ZookScreen>
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
  grid: {
    gap: spacing.sm,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.eyebrow,
    textTransform: "uppercase",
  },
});
