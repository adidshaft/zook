import { Stack, router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { GlassCard, ListRow, MobileHeader, SectionHeader, ZookButton, ZookScreen } from "@/components/primitives";
import { IdentityCard } from "@/features/member/you/identity-card";
import { MembershipSummary } from "@/features/member/you/membership-summary";
import { QuickActionGrid } from "@/features/member/you/quick-action-grid";
import { useAuth } from "@/lib/auth";
import { useMemberHome } from "@/lib/domains/member";
import { useMyNotifications } from "@/lib/domains/notifications";
import { useCanSwitchRole, useRoleContext } from "@/lib/role-context";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

const settingsRows = [
  { href: "/settings/account", title: "Account", icon: "person-outline" },
  { href: "/settings/appearance", title: "Appearance", icon: "contrast-outline" },
  { href: "/settings/notifications", title: "Notifications", icon: "notifications-outline" },
  { href: "/settings/language", title: "Language", icon: "language-outline" },
  { href: "/settings/privacy", title: "Privacy", icon: "lock-closed-outline" },
  { href: "/settings/support", title: "Help & support", icon: "help-circle-outline" },
] as const;

export default function YouScreen() {
  const { logout, switchRole } = useAuth();
  const canSwitch = useCanSwitchRole();
  const ctx = useRoleContext();
  const homeQuery = useMemberHome();
  const notificationsQuery = useMyNotifications();
  const { palette, preference } = useTheme();
  const unread =
    notificationsQuery.data?.notifications?.filter((notification) => !notification.readAt).length ??
    0;
  const nextRole = ctx?.availableRoles.find((role) => role !== ctx.role);
  const gymHref = ctx?.org?.username ? `/gyms/${ctx.org.username}` : "/gyms";

  function confirmSignOut() {
    Alert.alert("Sign out?", "You can sign back in with OTP any time.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void logout() },
    ]);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="member-you">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="You" subtitle="Profile, membership, settings, and tools" showProfileShortcut={false} />

          <IdentityCard user={ctx?.user} org={ctx?.org} onEdit={() => router.push("/profile/edit" as never)} />

          <SectionHeader title="Membership" />
          <MembershipSummary membership={homeQuery.data?.activeMembership} onViewDetail={() => router.push("/membership" as never)} />

          <SectionHeader title="Quick actions" />
          <QuickActionGrid unreadCount={unread} gymHref={gymHref} />

          <SectionHeader title="Settings" />
          <GlassCard variant="compact" contentStyle={styles.list}>
            {settingsRows.map((row) => (
              <Pressable key={row.href} onPress={() => router.push(row.href as never)} accessibilityRole="button" accessibilityLabel={row.title}>
                <ListRow
                  title={row.title}
                  subtitle={row.href === "/settings/appearance" ? titleCase(preference) : undefined}
                  icon={row.icon}
                />
              </Pressable>
            ))}
          </GlassCard>

          <View style={styles.actions}>
            {canSwitch && nextRole ? (
              <ZookButton icon="swap-horizontal-outline" tone="secondary" onPress={() => void switchRole(nextRole)}>
                Switch to {titleCase(nextRole)}
              </ZookButton>
            ) : null}
            <ZookButton icon="log-out-outline" tone="secondary" onPress={confirmSignOut}>
              Sign out
            </ZookButton>
          </View>

          <Text style={[styles.footer, { color: palette.text.tertiary }]}>Zook account center</Text>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

function titleCase(value: string) {
  return value.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
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
  list: { gap: 4 },
  actions: { gap: spacing.sm },
  footer: { textAlign: "center", ...typography.caption },
});
