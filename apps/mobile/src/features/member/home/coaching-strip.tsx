import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Ionicons } from "@expo/vector-icons";
import { Card, IconBubble, Pill, ProgressBar, SectionHeader } from "@/components/primitives";
import { useMyCoaching } from "@/lib/domains/member";
import { spacing, typography, useTheme } from "@/lib/theme";

export function CoachingStrip() {
  const router = useRouter();
  const { palette } = useTheme();
  const coachingQuery = useMyCoaching();
  const data = coachingQuery.data;
  const subscription = data?.subscription;

  // Only surface coaching for members who actually have a trainer.
  if (!subscription) return null;

  const total = subscription.totalSessions ?? 0;
  const remaining = subscription.remainingSessions ?? 0;
  const used = Math.max(0, total - remaining);
  const progress = total > 0 ? used / total : 0;

  return (
    <View>
      <SectionHeader title="Your coaching" />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Open your coaching"
        onPress={() => router.push("/coaching" as never)}
        style={({ pressed }) => (pressed ? styles.pressed : null)}
      >
        <Card contentStyle={styles.card}>
          <View style={styles.row}>
            <IconBubble icon="barbell" tone="lime" size={46} />
            <View style={styles.copy}>
              <Text style={[styles.coach, { color: palette.text.primary }]} numberOfLines={1}>
                {data?.trainer?.name ?? "Your trainer"}
              </Text>
              <Text style={[styles.plan, { color: palette.text.secondary }]} numberOfLines={1}>
                {subscription.planName ?? "Personal training"}
              </Text>
            </View>
            <Pill tone="lime">{`${remaining} left`}</Pill>
            <Ionicons name="chevron-forward" size={16} color={palette.text.tertiary} />
          </View>
          <ProgressBar value={progress} tone="lime" label={`${used} of ${total} sessions done`} />
        </Card>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.md },
  row: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  coach: { ...typography.cardTitle },
  plan: { ...typography.small },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
});
