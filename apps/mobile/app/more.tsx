import { Link, Stack } from "expo-router";
import type { Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useAuth } from "@/lib/auth";
import { useT } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/i18n";
import { colors, layout, spacing, typography } from "@/lib/theme";

type MoreEntry = {
  href: Href;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
};

const memberMoreItems: MoreEntry[] = [
  {
    href: "/tracking",
    titleKey: "more.tracking.title",
    subtitleKey: "more.tracking.subtitle",
    icon: "pulse-outline",
  },
  {
    href: "/shop",
    titleKey: "more.shop.title",
    subtitleKey: "more.shop.subtitle",
    icon: "storefront-outline",
  },
  {
    href: "/notifications",
    titleKey: "more.inbox.title",
    subtitleKey: "more.inbox.subtitle",
    icon: "notifications-outline",
  },
  {
    href: "/assistant",
    titleKey: "more.assistant.title",
    subtitleKey: "more.assistant.subtitle",
    icon: "sparkles-outline",
  },
  {
    href: "/profile",
    titleKey: "more.profile.title",
    subtitleKey: "more.profile.subtitle",
    icon: "person-outline",
  },
  {
    href: "/settings",
    titleKey: "more.settings.title",
    subtitleKey: "more.settings.subtitle",
    icon: "settings-outline",
  },
];

export default function More() {
  const { logout, session } = useAuth();
  const t = useT();
  const userName = session?.user.name?.trim() || t("more.fallbackName");
  const confirmSignOut = () => {
    Alert.alert(t("more.signOutConfirmTitle"), t("more.signOutConfirmBody"), [
      { text: t("more.signOutCancel"), style: "cancel" },
      {
        text: t("more.signOut"),
        style: "destructive",
        onPress: () => {
          void logout();
        },
      },
    ]);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader title={t("more.title")} subtitle={t("more.subtitle")} showProfileShortcut />

          <GlassCard variant="compact" contentStyle={styles.accountCard}>
            <IconBubble icon="person-outline" tone="lime" size={46} />
            <View style={styles.accountCopy}>
              <Text numberOfLines={1} style={styles.accountTitle}>
                {userName}
              </Text>
              <Text numberOfLines={1} style={styles.accountSubtitle}>
                {t("more.accountSubtitle")}
              </Text>
            </View>
            <ZookButton
              onPress={confirmSignOut}
              tone="secondary"
              size="sm"
              accessibilityLabel={t("more.signOut")}
            >
              {t("more.signOut")}
            </ZookButton>
          </GlassCard>

          <View style={styles.list}>
            {memberMoreItems.map((item) => {
              const title = t(item.titleKey);
              return (
                <Link key={item.titleKey} href={item.href} asChild>
                  <Pressable accessibilityRole="link" accessibilityLabel={title}>
                    <ListRow title={title} subtitle={t(item.subtitleKey)} icon={item.icon} />
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </ScrollView>
        <BottomNav selectedPath="/more" />
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    paddingBottom: layout.bottomNavContentPadding,
    gap: 14,
  },
  accountCard: {
    minHeight: 78,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  accountCopy: {
    flex: 1,
    gap: 3,
  },
  accountTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  accountSubtitle: {
    color: colors.muted,
    ...typography.small,
  },
  list: {
    gap: 10,
  },
});
