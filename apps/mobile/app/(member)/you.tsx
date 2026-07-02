import { Stack, router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { AnimatedAppear, Card, IconBubble, ScreenHeader, SectionHeader, ZookButton, ZookScreen, useConfirmSheet } from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { IdentityCard } from "@/features/member/you/identity-card";
import { MembershipSummary } from "@/features/member/you/membership-summary";
import { QuickActionGrid } from "@/features/member/you/quick-action-grid";
import { useAuth } from "@/lib/auth";
import { useMemberHome } from "@/lib/domains/member";
import { useT } from "@/lib/i18n";
import { useRoleContext } from "@/lib/role-context";
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
  const { logout } = useAuth();
  const ctx = useRoleContext();
  const homeQuery = useMemberHome();
  const { palette, preference } = useTheme();
  const t = useT();
  const signOutConfirm = useConfirmSheet();
  const scrollY = useSharedValue(0);
  
  function confirmSignOut() {
    signOutConfirm.confirm({
      title: t("more.signOutConfirmTitle"),
      body: t("more.signOutConfirmBody"),
      destructiveLabel: t("more.signOut"),
      onConfirm: () => void logout(),
    });
  }

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
            <QuickActionGrid
              unreadCount={homeQuery.data?.unreadNotifications ?? 0}
            />
          </AnimatedAppear>

          <AnimatedAppear delay={100}>
            <SectionHeader title={t("more.settings.title")} />
            <Card variant="compact" contentStyle={styles.settingsList}>
              {settingsRows.map((row) => (
                <SettingsTile
                  key={row.href}
                  title={t(row.titleKey)}
                  subtitle={row.href === "/settings/appearance" ? t(`member.you.theme.${preference}`) : undefined}
                  icon={row.icon}
                  onPress={() => router.push(row.href as never)}
                />
              ))}
            </Card>
          </AnimatedAppear>

          <AnimatedAppear delay={140}>
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

function SettingsTile({
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
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      style={({ pressed }) => [
        styles.settingsTile,
        pressed ? styles.rowPressed : null,
      ]}
    >
      <IconBubble icon={icon} tone="neutral" size={32} />
      <View style={styles.settingsTileCopy}>
        <Text numberOfLines={1} style={[styles.settingsTileTitle, { color: palette.text.primary }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.settingsTileSubtitle, { color: palette.text.secondary }]}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={14} color={palette.text.tertiary} style={styles.settingsTileChevron} />
    </Pressable>
  );
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
  settingsList: {
    gap: 4,
  },
  settingsTile: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 50,
    minWidth: 0,
    paddingHorizontal: 8,
  },
  rowPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  settingsTileCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  settingsTileTitle: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  settingsTileSubtitle: {
    ...typography.navLabel,
  },
  settingsTileChevron: {
    opacity: 0.55,
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
