import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { Card, IconBubble } from "@/components/primitives";
import { useTonePalette } from "@/components/primitives/tone-palette";
import { useMyCoaching } from "@/lib/domains/member";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";

export function CoachingStrip() {
  const router = useRouter();
  const { palette } = useTheme();
  const sessionTone = useTonePalette("lime");
  const t = useT();
  const coachingQuery = useMyCoaching();
  const data = coachingQuery.data;
  const subscription = data?.subscription;

  // Only surface coaching for members who actually have a trainer.
  if (!subscription) return null;

  const remaining = subscription.remainingSessions ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${t("member.home.openYourCoaching")}. ${data?.trainer?.name ?? t("member.home.yourTrainer")}. ${t("member.home.sessionsLeftShort", { count: remaining })}.`}
      onPress={() => router.push("/coaching" as never)}
      style={({ pressed }) => (pressed ? styles.pressed : null)}
    >
      <Card contentStyle={styles.card}>
        <View style={styles.row}>
          <IconBubble icon="barbell" tone="lime" size={34} />
          <View style={styles.copy}>
            <Text style={[styles.sectionLabel, { color: palette.text.secondary }]} numberOfLines={1}>
              {t("member.home.yourCoaching")}
            </Text>
            <Text style={[styles.coach, { color: palette.text.primary }]} numberOfLines={1}>
              {data?.trainer?.name ?? t("member.home.yourTrainer")}
            </Text>
            <Text style={[styles.plan, { color: palette.text.secondary }]} numberOfLines={1}>
              {subscription.planName ?? t("member.home.personalTraining")}
            </Text>
          </View>
          <View
            style={[
              styles.sessionStat,
              {
                borderColor: sessionTone.borderColor,
                backgroundColor: sessionTone.backgroundColor,
              },
            ]}
          >
            <Ionicons name="repeat" size={13} color={sessionTone.color} />
            <Text style={[styles.sessionCount, { color: sessionTone.color }]}>{remaining}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={palette.text.tertiary} />
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.xs, paddingVertical: 10, paddingHorizontal: 12 },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  sectionLabel: { ...typography.caption, fontFamily: "Inter_700Bold", textTransform: "uppercase" },
  coach: { ...typography.bodyStrong },
  plan: { ...typography.small },
  sessionStat: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 4,
    height: 28,
    justifyContent: "center",
    minWidth: 42,
    paddingHorizontal: spacing.xs,
  },
  sessionCount: { ...typography.small, fontWeight: "800" },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});
