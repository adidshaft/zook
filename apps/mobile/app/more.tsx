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
import { colors, layout, spacing, typography } from "@/lib/theme";

const memberMoreItems: Array<{
  href: Href;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    href: "/tracking",
    title: "Tracking",
    subtitle: "Log workouts, weight, and habits.",
    icon: "pulse-outline",
  },
  {
    href: "/shop",
    title: "Shop",
    subtitle: "Order gym essentials for desk pickup.",
    icon: "storefront-outline",
  },
  {
    href: "/notifications",
    title: "Inbox",
    subtitle: "Payments, plans, and gym updates.",
    icon: "notifications-outline",
  },
  {
    href: "/assistant",
    title: "Plan assistant",
    subtitle: "AI is coming soon; trainer plans stay manual.",
    icon: "sparkles-outline",
  },
  {
    href: "/profile",
    title: "Profile",
    subtitle: "Membership details and personal info.",
    icon: "person-outline",
  },
  {
    href: "/settings",
    title: "Settings",
    subtitle: "Language, roles, privacy, and account.",
    icon: "settings-outline",
  },
];

export default function More() {
  const { logout, session } = useAuth();
  const userName = session?.user.name ?? "Member";
  const confirmSignOut = () => {
    Alert.alert("Sign out?", "You can sign back in with OTP any time.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
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
          <MobileHeader title="More" subtitle="Everything else in one place." showProfileShortcut />

          <GlassCard variant="compact" contentStyle={styles.accountCard}>
            <IconBubble icon="person-outline" tone="lime" size={46} />
            <View style={styles.accountCopy}>
              <Text numberOfLines={1} style={styles.accountTitle}>
                {userName}
              </Text>
              <Text numberOfLines={1} style={styles.accountSubtitle}>
                Zook member account
              </Text>
            </View>
            <ZookButton
              onPress={confirmSignOut}
              tone="secondary"
              size="sm"
              accessibilityLabel="Sign out"
            >
              Sign out
            </ZookButton>
          </GlassCard>

          <View style={styles.list}>
            {memberMoreItems.map((item) => (
              <Link key={item.title} href={item.href} asChild>
                <Pressable accessibilityRole="link" accessibilityLabel={item.title}>
                  <ListRow title={item.title} subtitle={item.subtitle} icon={item.icon} />
                </Pressable>
              </Link>
            ))}
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
