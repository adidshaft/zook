import { Stack, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AnimatedAppear, Card, ListRow, ScreenHeader, SectionHeader, ZookButton, ZookScreen, useConfirmSheet } from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { IdentityCard } from "@/features/member/you/identity-card";
import { MembershipSummary } from "@/features/member/you/membership-summary";
import { useAuth } from "@/lib/auth";
import { useMemberHome } from "@/lib/domains/member";
import { useT } from "@/lib/i18n";
import { useCanSwitchRole, useRoleContext } from "@/lib/role-context";
import { useSharedValue } from "@/lib/reanimated-lite";
import { layout, spacing, typography } from "@/lib/theme";
import { useTheme } from "@/lib/theme/index";

const settingsRows = [
  { href: "/settings/account", titleKey: "settings.account", icon: "person-outline" },
  { href: "/settings/appearance", titleKey: "member.you.appearance", icon: "contrast-outline" },
  { href: "/settings/notifications", titleKey: "settings.notifications", icon: "notifications-outline" },
  { href: "/settings/privacy", titleKey: "member.you.privacy", icon: "lock-closed-outline" },
  { href: "/settings/support", titleKey: "member.you.helpSupport", icon: "help-circle-outline" },
] as const;

export default function YouScreen() {
  const { logout, switchRole } = useAuth();
  const canSwitch = useCanSwitchRole();
  const ctx = useRoleContext();
  const homeQuery = useMemberHome();
  const { palette, preference } = useTheme();
  const t = useT();
  const signOutConfirm = useConfirmSheet();
  const scrollY = useSharedValue(0);
  
  const nextRole = ctx?.availableRoles.find((role) => role !== ctx?.role);
  const gymHref = ctx?.org?.username ? `/gyms/${ctx.org.username}` : "/gyms";

  function confirmSignOut() {
    signOutConfirm.confirm({
      title: t("more.signOutConfirmTitle"),
      body: t("more.signOutConfirmBody"),
      destructiveLabel: t("more.signOut"),
      onConfirm: () => void logout(),
    });
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
          onScroll={(event) => {
            scrollY.value = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          <ScreenHeader title={t("nav.profile")} contextSlot={<RoleSwitcherContextPill />} scrollY={scrollY} />

          <AnimatedAppear delay={0}>
            <IdentityCard
              user={ctx?.user}
              org={ctx?.org}
              onEdit={() => router.push("/profile/edit" as never)}
            />
          </AnimatedAppear>

          <AnimatedAppear delay={40}>
            <SectionHeader title={t("member.you.membership")} />
            <MembershipSummary
              membership={homeQuery.data?.activeMembership}
              onViewDetail={() => router.push("/membership" as never)}
            />
          </AnimatedAppear>

          <AnimatedAppear delay={80}>
            <SectionHeader title={t("member.you.quickActions")} />
            <Card variant="compact" contentStyle={styles.list}>
            {showBackToOwner && (
              <PillActionRow
                title={t("member.you.backToOwnerMode")}
                icon="apps-outline"
                onPress={() => void switchRole("OWNER")}
              />
            )}
            
            {showSwitchRole && nextRole && (
              <PillActionRow
                title={t("member.you.switchToRole", { role: titleCase(nextRole) })}
                icon="swap-horizontal-outline"
                onPress={() => void switchRole(nextRole)}
              />
            )}

            <PillActionRow
              title={t("member.you.switchGym")}
              icon="business-outline"
              onPress={() => router.push(gymHref as never)}
            />
            <PillActionRow
              title={t("member.you.gymShop")}
              icon="storefront-outline"
              onPress={() => router.push("/shop" as never)}
            />
            </Card>
          </AnimatedAppear>

          <AnimatedAppear delay={120}>
            <SectionHeader title={t("more.settings.title")} />
            <Card variant="compact" contentStyle={styles.list}>
            {settingsRows.map((row) => (
              <PillActionRow
                key={row.href}
                title={t(row.titleKey)}
                subtitle={row.href === "/settings/appearance" ? t(`member.you.theme.${preference}`) : undefined}
                icon={row.icon}
                onPress={() => router.push(row.href as never)}
              />
            ))}
            </Card>
          </AnimatedAppear>

          <AnimatedAppear delay={160}>
            <View style={styles.signOutContainer}>
              <ZookButton
                onPress={confirmSignOut}
                variant="destructive"
                icon="log-out-outline"
                fullWidth
                accessibilityLabel={t("more.signOut")}
              >
                {t("more.signOut")}
              </ZookButton>
            </View>
          </AnimatedAppear>

          <Text style={[styles.footer, { color: palette.text.tertiary }]}>
            {t("member.you.accountCenter")}
          </Text>
        </ScrollView>
      </ZookScreen>
      {signOutConfirm.sheet}
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
    gap: spacing.lg,
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
