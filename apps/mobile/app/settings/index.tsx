import { router } from "expo-router";
import { ScrollView, StyleSheet } from "react-native";

import { Card, ListRow, ScreenHeader, ZookScreen } from "@/components/primitives";
import { useT, type TranslationKey } from "@/lib/i18n";
import { layout, spacing } from "@/lib/theme";

const sections = [
  {
    href: "/settings/account",
    icon: "person-outline",
    subtitleKey: "settings.accountSubtitle",
    titleKey: "settings.account",
  },
  {
    href: "/settings/appearance",
    icon: "contrast-outline",
    subtitleKey: "settings.appearanceSubtitle",
    titleKey: "member.you.appearance",
  },
  {
    href: "/settings/language",
    icon: "language-outline",
    subtitleKey: "settings.languageSubtitle",
    titleKey: "settings.language",
  },
  {
    href: "/settings/notifications",
    icon: "notifications-outline",
    subtitleKey: "settings.notificationsSubtitle",
    titleKey: "settings.notifications",
  },
  {
    href: "/settings/privacy",
    icon: "lock-closed-outline",
    subtitleKey: "settings.privacySubtitle",
    titleKey: "member.you.privacy",
  },
  {
    href: "/settings/support",
    icon: "help-circle-outline",
    subtitleKey: "settings.supportSubtitle",
    titleKey: "member.you.helpSupport",
  },
] satisfies Array<{
  href: string;
  icon: Parameters<typeof ListRow>[0]["icon"];
  subtitleKey: TranslationKey;
  titleKey: TranslationKey;
}>;

export default function SettingsIndexScreen() {
  const t = useT();
  return (
    <>
      <ZookScreen testID="settings-index-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <ScreenHeader title={t("more.settings.title")} showBack />
          <Card variant="compact" contentStyle={styles.list}>
            {sections.map((section) => (
              <ListRow
                key={section.href}
                title={t(section.titleKey)}
                subtitle={t(section.subtitleKey)}
                icon={section.icon}
                onPress={() => router.push(section.href as never)}
                accessibilityLabel={t(section.titleKey)}
              />
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
});
