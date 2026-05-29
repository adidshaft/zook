import { Stack, router } from "expo-router";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { MobileHeader, SectionHeader, ZookScreen } from "@/components/primitives";
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
  const { palette, preference, mode } = useTheme();
  
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
          <View style={styles.listContainer}>
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
          </View>

          <SectionHeader title="Settings" />
          <View style={styles.listContainer}>
            {settingsRows.map((row) => (
              <PillActionRow
                key={row.href}
                title={row.title}
                subtitle={row.href === "/settings/appearance" ? titleCase(preference) : undefined}
                icon={row.icon}
                onPress={() => router.push(row.href as never)}
              />
            ))}
          </View>

          <View style={styles.signOutContainer}>
            <Pressable
              onPress={confirmSignOut}
              style={({ pressed }) => [
                styles.signOutButton,
                {
                  borderColor: mode === "dark" ? "rgba(255, 90, 61, 0.55)" : "rgba(220, 38, 38, 0.55)",
                  backgroundColor: mode === "dark" ? "rgba(255, 90, 61, 0.08)" : "rgba(220, 38, 38, 0.04)",
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                name="log-out-outline"
                size={22}
                color={mode === "dark" ? "#FF5A3D" : "#DC2626"}
                style={{ marginRight: 8 }}
              />
              <Text
                style={[
                  styles.signOutText,
                  { color: mode === "dark" ? "#FFFFFF" : "#DC2626" },
                ]}
              >
                Sign out
              </Text>
            </Pressable>
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
  icon: string;
  onPress: () => void;
}) {
  const { palette, mode } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.pillRow,
        {
          backgroundColor: mode === "dark" ? "#000000" : palette.bg.elevated,
          borderColor: palette.border.default,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.pillRowLeft}>
        <View
          style={[
            styles.iconWrapper,
            {
              backgroundColor: mode === "dark" ? "rgba(255, 255, 255, 0.05)" : "rgba(17, 21, 15, 0.04)",
            },
          ]}
        >
          <Ionicons name={icon as any} size={20} color={palette.text.primary} />
        </View>
        <View style={styles.pillRowTextContainer}>
          <Text style={[styles.pillRowText, { color: palette.text.primary }]}>{title}</Text>
          {subtitle && (
            <Text style={[styles.pillRowSubtitle, { color: palette.text.tertiary }]}>{subtitle}</Text>
          )}
        </View>
      </View>
      <Ionicons name="chevron-forward-outline" size={20} color={palette.text.tertiary} />
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
  listContainer: {
    gap: 2,
  },
  pillRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 24,
    borderWidth: 1.5,
    marginBottom: 8,
    // Soft drop shadow
    shadowColor: "#000000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  pillRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  pillRowTextContainer: {
    flex: 1,
  },
  pillRowText: {
    fontSize: 14.5,
    fontFamily: "Inter_600SemiBold",
  },
  pillRowSubtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  signOutContainer: {
    marginTop: 8,
    marginBottom: 16,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 24,
    borderWidth: 2,
    // Shadow glow for red
    shadowColor: "#FF5A3D",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  signOutText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  footer: {
    textAlign: "center",
    ...typography.caption,
    marginTop: 8,
  },
});
