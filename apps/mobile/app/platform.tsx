import { Stack } from "expo-router";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import {
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  SecondaryButton,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { legacyColors, layout, spacing, typography } from "@/lib/theme";

export default function PlatformMobile() {
  const { logout, session } = useAuth();
  const platformEmail = encodeURIComponent(session?.user.email || "platform@zook.local");
  const platformWebUrl = toWebUrl(
    `/login?redirect=${encodeURIComponent("/platform")}&email=${platformEmail}`,
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="platform-home-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            eyebrow="Platform operator"
            title="Open the web dashboard"
            subtitle={`${session?.user.name ?? "Platform team"} · this role is easier on desktop`}
            chip={<StatusChip status="Web dashboard" tone="amber" />}
            centered
            showProfileShortcut={false}
          />

          <ZookButton
            testID="platform-open-web-dashboard"
            icon="open-outline"
            onPress={() => void Linking.openURL(platformWebUrl)}
            style={styles.primaryAction}
          >
            Open Web Dashboard
          </ZookButton>

          <GlassCard contentStyle={styles.heroContent}>
            <IconBubble icon="shield-checkmark-outline" tone="amber" size={52} />
            <View style={styles.heroCopy}>
              <Text style={styles.title}>Platform operations stay on web.</Text>
              <Text style={styles.body}>
                The full dashboard gives you room to review gyms, service status, safety reports,
                and account changes. The mobile app stays focused on daily gym work.
              </Text>
            </View>
          </GlassCard>

          <GlassCard variant="compact" contentStyle={styles.stack}>
            <ListRow
              title="Mobile app"
              subtitle="Daily work for members, trainers, desk teams, owners, and admins."
              icon="phone-portrait-outline"
              tone="lime"
            />
            <ListRow
              title="Web dashboard"
              subtitle="Gym reviews, service status, safety reports, and account controls."
              icon="desktop-outline"
              tone="amber"
            />
          </GlassCard>

          <SecondaryButton testID="platform-sign-out" icon="log-out-outline" onPress={() => void logout()}>
            Sign out
          </SecondaryButton>
        </ScrollView>
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
    gap: 16,
    paddingBottom: layout.bottomNavContentPadding,
  },
  primaryAction: {
    alignSelf: "stretch",
  },
  heroContent: {
    gap: spacing.md,
  },
  heroCopy: {
    gap: 8,
  },
  title: {
    color: legacyColors.text,
    ...typography.screenTitle,
  },
  body: {
    color: legacyColors.muted,
    ...typography.body,
  },
  stack: {
    gap: spacing.md,
  },
});
