import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { Card, ListRow, AppHeader, ZookScreen } from "@/components/primitives";
import { layout, spacing } from "@/lib/theme";

const sections = [
  { href: "/settings/account", title: "Account", subtitle: "Name, phone, email, and biometric unlock", icon: "person-outline" },
  { href: "/settings/appearance", title: "Appearance", subtitle: "Theme and default role", icon: "contrast-outline" },
  { href: "/settings/notifications", title: "Notifications", subtitle: "Push categories and reminders", icon: "notifications-outline" },
  { href: "/settings/privacy", title: "Privacy", subtitle: "Data export and account deletion", icon: "lock-closed-outline" },
  { href: "/settings/support", title: "Help & support", subtitle: "Contact, legal, and app version", icon: "help-circle-outline" },
] as const;

export default function SettingsIndexScreen() {
  return (
    <>
      <ZookScreen testID="settings-index-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <AppHeader title="Settings" subtitle="Choose a section" showProfileShortcut={false} />
          <Card variant="compact" contentStyle={styles.list}>
            {sections.map((section) => (
              <Pressable
                key={section.href}
                onPress={() => router.push(section.href as never)}
                accessibilityRole="button"
                accessibilityLabel={section.title}
                style={({ pressed }) => (pressed ? styles.rowPressed : null)}
              >
                <ListRow title={section.title} subtitle={section.subtitle} icon={section.icon} />
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
    paddingTop: 14,
    width: "100%",
  },
  list: { gap: 4 },
  rowPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
});
