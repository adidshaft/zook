import { router } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import type { Role } from "@zook/core";

import { AppHeader, Card, ZookButton, ZookScreen } from "@/components/primitives";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

type RoleShortcut = {
  label: string;
  role: Role;
  target: string;
  testID: string;
};

const publicShortcuts = [
  { label: "Login", href: "/login", testID: "qa-public-login" },
  { label: "Gyms", href: "/gyms", testID: "qa-public-gyms" },
  { label: "Aarogya gym", href: "/gyms/aarogya-strength", testID: "qa-public-gym-aarogya" },
  { label: "Language", href: "/onboarding/language", testID: "qa-public-language" },
  { label: "Value props", href: "/onboarding/value-props", testID: "qa-public-value-props" },
] as const;

const roleShortcuts: readonly RoleShortcut[] = [
  { label: "Member home", role: "MEMBER", target: "/", testID: "qa-member-home" },
  { label: "Member progress", role: "MEMBER", target: "/progress", testID: "qa-member-progress" },
  { label: "Member scan", role: "MEMBER", target: "/scan", testID: "qa-member-scan" },
  { label: "Member plan", role: "MEMBER", target: "/plan", testID: "qa-member-plan" },
  { label: "Member membership", role: "MEMBER", target: "/membership", testID: "qa-member-membership" },
  { label: "Member classes", role: "MEMBER", target: "/classes", testID: "qa-member-classes" },
  { label: "Member shop", role: "MEMBER", target: "/__qa-open?kind=member-shop", testID: "qa-member-shop" },
  { label: "Member assistant", role: "MEMBER", target: "/assistant", testID: "qa-member-assistant" },
  { label: "Member notifications", role: "MEMBER", target: "/notifications", testID: "qa-member-notifications" },
  { label: "Member history", role: "MEMBER", target: "/tracking-history", testID: "qa-member-history" },
  { label: "Member tracking entry", role: "MEMBER", target: "/tracking-entry", testID: "qa-member-tracking-entry" },
  { label: "Member attendance detail", role: "MEMBER", target: "/__qa-open?kind=member-attendance-detail", testID: "qa-member-attendance-detail" },
  { label: "Owner home", role: "OWNER", target: "/owner", testID: "qa-owner-home" },
  { label: "Owner members", role: "OWNER", target: "/owner/members", testID: "qa-owner-members" },
  { label: "Owner member detail", role: "OWNER", target: "/__qa-open?kind=owner-member-detail", testID: "qa-owner-member-detail" },
  { label: "Owner approvals", role: "OWNER", target: "/owner/approvals", testID: "qa-owner-approvals" },
  { label: "Owner revenue", role: "OWNER", target: "/owner/revenue", testID: "qa-owner-revenue" },
  { label: "Owner stock", role: "OWNER", target: "/owner/stock", testID: "qa-owner-stock" },
  { label: "Owner billing", role: "OWNER", target: "/owner/billing", testID: "qa-owner-billing" },
  { label: "Owner more", role: "OWNER", target: "/owner/more", testID: "qa-owner-more" },
  { label: "Owner notifications", role: "OWNER", target: "/notifications", testID: "qa-owner-notifications" },
  { label: "Admin home", role: "ADMIN", target: "/owner", testID: "qa-admin-home" },
  { label: "Admin approvals", role: "ADMIN", target: "/owner/approvals", testID: "qa-admin-approvals" },
  { label: "Admin stock", role: "ADMIN", target: "/owner/stock", testID: "qa-admin-stock" },
  { label: "Admin more", role: "ADMIN", target: "/owner/more", testID: "qa-admin-more" },
  { label: "Trainer home", role: "TRAINER", target: "/trainer", testID: "qa-trainer-home" },
  { label: "Trainer clients", role: "TRAINER", target: "/trainer?view=clients", testID: "qa-trainer-clients" },
  { label: "Trainer plans", role: "TRAINER", target: "/trainer?view=plans", testID: "qa-trainer-plans" },
  { label: "Trainer payouts", role: "TRAINER", target: "/trainer?view=payouts", testID: "qa-trainer-payouts" },
  { label: "Trainer client detail", role: "TRAINER", target: "/__qa-open?kind=trainer-client-detail", testID: "qa-trainer-client-detail" },
  { label: "Trainer client plan", role: "TRAINER", target: "/__qa-open?kind=trainer-client-plan", testID: "qa-trainer-client-plan" },
  { label: "Trainer client sessions", role: "TRAINER", target: "/__qa-open?kind=trainer-client-sessions", testID: "qa-trainer-client-sessions" },
  { label: "Reception home", role: "RECEPTIONIST", target: "/reception", testID: "qa-reception-home" },
  { label: "Reception members", role: "RECEPTIONIST", target: "/reception/members", testID: "qa-reception-members" },
  { label: "Reception member detail", role: "RECEPTIONIST", target: "/__qa-open?kind=reception-member-detail", testID: "qa-reception-member-detail" },
  { label: "Reception payments", role: "RECEPTIONIST", target: "/reception/payments", testID: "qa-reception-payments" },
  { label: "Reception orders", role: "RECEPTIONIST", target: "/reception/orders", testID: "qa-reception-orders" },
  { label: "Reception scan", role: "RECEPTIONIST", target: "/scan", testID: "qa-reception-scan" },
  { label: "Reception verification", role: "RECEPTIONIST", target: "/__qa-open?kind=reception-verification", testID: "qa-reception-verification" },
] as const;

function launchRoleShortcut(shortcut: RoleShortcut) {
  const query = new URLSearchParams({
    role: shortcut.role,
    target: shortcut.target,
  }).toString();
  router.replace((`/__qa-role?${query}`) as never);
}

export default function QaLauncherScreen() {
  const { palette } = useTheme();

  return (
    <ZookScreen testID="qa-launcher-screen">
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        <AppHeader
          title="QA shortcuts"
          subtitle="Open seeded roles and key routes without OS deep-link prompts."
          showProfileShortcut={false}
          showBack
        />

        <Card contentStyle={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Public</Text>
          <View style={styles.grid}>
            {publicShortcuts.map((shortcut) => (
              <ZookButton
                key={shortcut.testID}
                testID={shortcut.testID}
                variant="secondary"
                onPress={() => router.replace(shortcut.href as never)}
              >
                {shortcut.label}
              </ZookButton>
            ))}
          </View>
        </Card>

        <Card contentStyle={styles.section}>
          <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Roles</Text>
          <View style={styles.grid}>
            {roleShortcuts.map((shortcut) => (
              <ZookButton
                key={shortcut.testID}
                testID={shortcut.testID}
                variant="secondary"
                onPress={() => launchRoleShortcut(shortcut)}
              >
                {shortcut.label}
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
