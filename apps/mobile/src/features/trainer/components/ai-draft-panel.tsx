import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard } from "@/components/primitives";
import { legacyColors, spacing, typography } from "@/lib/theme";

export function AiDraftPanel({ clientId }: { clientId: string }) {
  return (
    <GlassCard testID="trainer-ai-draft-panel" contentStyle={styles.lockedCard}>
      <View style={styles.lockIcon}>
        <Ionicons name="lock-closed-outline" size={28} color={legacyColors.lime} />
      </View>
      <Text style={styles.title}>Feature Locked</Text>
      <Text style={styles.body}>
        AI features are currently disabled. Trainers can still manage client {clientId ? "plans" : "plans"} manually.
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  lockedCard: {
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  lockIcon: {
    alignItems: "center",
    backgroundColor: "rgba(185,244,85,0.12)",
    borderColor: "rgba(185,244,85,0.42)",
    borderRadius: 24,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    width: 56,
  },
  title: {
    ...typography.h2,
    color: legacyColors.text,
    textAlign: "center",
  },
  body: {
    ...typography.body,
    color: legacyColors.muted,
    textAlign: "center",
  },
});
