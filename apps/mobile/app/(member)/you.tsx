import { Stack, router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { GlassCard, ListRow, MobileHeader, SectionHeader, ZookButton, ZookScreen } from "@/components/primitives";
import { IdentityCard } from "@/features/member/you/identity-card";
import { MembershipSummary } from "@/features/member/you/membership-summary";
import { useAuth } from "@/lib/auth";
import { useMemberHome } from "@/lib/domains/member";
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
  const { palette, preference } = useTheme();
  
  const nextRole = ctx?.availableRoles.find((role) => role !== ctx?.role);
  const gymHref = ctx?.org?.username ? `/gyms/${ctx.org.username}` : "/gyms";

  function confirmSignOut() {
    Alert.alert("Sign out?", "You can sign back in with OTP any time.", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: () => void logout() },
    ]);
  }

  const isOwnerAvailable = ctx?.availableRoles.includes("OWNER");
  const showBackToOwner = canSwitch && isOwnerAvailable && ctx?.role !== "OWNER";
  const showSwitchRole = canSwitch && nextRole && !showBackToOwner;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="member-you">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            title="You"
            subtitle="Profile, membership, settings, and tools"
            showProfileShortcut={false}
          />

          <IdentityCard
            user={ctx?.user}
            org={ctx?.org}
            onEdit={() => router.push("/profile/edit" as never)}
          />

          <SectionHeader title="Membership" />
          <MembershipSummary
            membership={homeQuery.data?.activeMembership}
            onViewDetail={() => router.push("/membership" as never)}
          />

          <SectionHeader title="Quick actions" />
          <GlassCard variant="compact" contentStyle={styles.list}>
            {showBackToOwner && (
              <PillActionRow
                title="Back to Owner mode"
                icon="apps-outline"
                onPress={() => void switchRole("OWNER")}
              />
            )}
            
            {showSwitchRole && nextRole && (
              <PillActionRow
                title={`Switch to ${titleCase(nextRole)}`}
                icon="swap-horizontal-outline"
                onPress={() => void switchRole(nextRole)}
              />
            )}

            <PillActionRow
              title="Switch gym"
              icon="business-outline"
              onPress={() => router.push(gymHref as never)}
            />
          </GlassCard>

          <SectionHeader title="Settings" />
          <GlassCard variant="compact" contentStyle={styles.list}>
            {settingsRows.map((row) => (
              <PillActionRow
                key={row.href}
                title={row.title}
                subtitle={row.href === "/settings/appearance" ? titleCase(preference) : undefined}
                icon={row.icon}
                onPress={() => router.push(row.href as never)}
              />
            ))}
          </GlassCard>

          <View style={styles.signOutContainer}>
            <ZookButton
              onPress={confirmSignOut}
              tone="danger"
              icon="log-out-outline"
              fullWidth
              accessibilityLabel="Sign out"
            >
              Sign out
            </ZookButton>
          </View>

          <Text style={[styles.footer, { color: palette.text.tertiary }]}>
            Zook account center
          </Text>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

function PillActionRow({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.rowPressable,
        pressed ? styles.rowPressed : null,
      ]}
    >
      <ListRow title={title} subtitle={subtitle} icon={icon} />
    </Pressable>
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
    paddingTop: 20,
    width: "100%",
  },
  list: {
    gap: 4,
  },
  rowPressable: {
    borderRadius: 18,
  },
  rowPressed: {
    opacity: 0.86,
  },
  signOutContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  footer: {
    textAlign: "center",
    ...typography.caption,
    marginTop: 8,
  },
});
