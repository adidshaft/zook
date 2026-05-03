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
import { colors, layout, spacing, typography } from "@/lib/theme";

export default function PlatformMobile() {
  const { logout, session } = useAuth();
  const platformEmail = encodeURIComponent(session?.user.email ?? "platform@zook.local");
  const platformWebUrl = toWebUrl(
    `/login?redirect=${encodeURIComponent("/platform")}&email=${platformEmail}`,
  );

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            eyebrow="Platform admin"
            title="Use the web control room"
            subtitle={`${session?.user.name ?? "Platform team"} · mobile access is intentionally limited`}
            chip={<StatusChip status="Web only" tone="amber" />}
            centered
            showProfileShortcut={false}
          />

          <ZookButton
            icon="open-outline"
            onPress={() => void Linking.openURL(platformWebUrl)}
            style={styles.primaryAction}
          >
            Continue on Web
          </ZookButton>

          <GlassCard contentStyle={styles.heroContent}>
            <IconBubble icon="shield-checkmark-outline" tone="amber" size={52} />
            <View style={styles.heroCopy}>
              <Text style={styles.title}>Platform operations stay on web.</Text>
              <Text style={styles.body}>
                Provider diagnostics, org moderation, readiness checks, and platform audit trails
                need the full dashboard workspace. The mobile app is reserved for daily gym
                execution roles. The browser may ask for OTP once before opening the platform
                dashboard.
              </Text>
            </View>
          </GlassCard>

          <GlassCard variant="compact" contentStyle={styles.stack}>
            <ListRow
              title="Mobile app roles"
              subtitle="Member, trainer, receptionist, owner, and admin execution surfaces."
              icon="phone-portrait-outline"
              tone="lime"
            />
            <ListRow
              title="Platform control room"
              subtitle="Organizations, providers, diagnostics, safety, and audit."
              icon="desktop-outline"
              tone="amber"
            />
          </GlassCard>

          <SecondaryButton icon="log-out-outline" onPress={() => void logout()}>
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
    color: colors.text,
    ...typography.screenTitle,
  },
  body: {
    color: colors.muted,
    ...typography.body,
  },
  stack: {
    gap: spacing.md,
  },
});
