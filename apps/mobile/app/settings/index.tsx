import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { Card, ListRow, AppHeader, ZookScreen } from "@/components/primitives";
import { useT } from "@/lib/i18n";
import { layout, spacing } from "@/lib/theme";

const sections = [
  { href: "/settings/account", titleKey: "settings.account", subtitleKey: "settings.accountSubtitle", icon: "person-outline" },
  { href: "/settings/appearance", titleKey: "member.you.appearance", subtitleKey: "settings.appearanceSubtitle", icon: "contrast-outline" },
  { href: "/settings/language", titleKey: "settings.language", subtitleKey: "settings.languageSubtitle", icon: "language-outline" },
  { href: "/settings/notifications", titleKey: "settings.notifications", subtitleKey: "settings.notificationsSubtitle", icon: "notifications-outline" },
  { href: "/settings/privacy", titleKey: "member.you.privacy", subtitleKey: "settings.privacySubtitle", icon: "lock-closed-outline" },
  { href: "/settings/support", titleKey: "member.you.helpSupport", subtitleKey: "settings.supportSubtitle", icon: "help-circle-outline" },
] as const;

export default function SettingsIndexScreen() {
  const t = useT();
  return (
    <>
      <ZookScreen testID="settings-index-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <AppHeader title={t("more.settings.title")} showBack />
          <Card variant="compact" contentStyle={styles.list}>
            {sections.map((section) => (
              <Pressable
                key={section.href}
                onPress={() => router.push(section.href as never)}
                accessibilityRole="button"
                accessibilityLabel={t(section.titleKey)}
                style={({ pressed }) => (pressed ? styles.rowPressed : null)}
              >
                <ListRow title={t(section.titleKey)} subtitle={t(section.subtitleKey)} icon={section.icon} />
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
  list: { gap: 4 },
  rowPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
