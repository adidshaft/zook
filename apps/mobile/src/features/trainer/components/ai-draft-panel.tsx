import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard, SecondaryButton, ZookButton } from "@/components/primitives";
import { legacyColors, spacing, typography } from "@/lib/theme";

export function AiDraftPanel({ clientId }: { clientId: string }) {
  const [status, setStatus] = useState("AI drafting is disabled in local E2E.");

  return (
    <GlassCard testID="trainer-ai-draft-screen" contentStyle={styles.lockedCard}>
      <View style={styles.lockIcon}>
        <Ionicons name="lock-closed-outline" size={28} color={legacyColors.lime} />
      </View>
      <Text style={styles.title}>Feature Locked</Text>
      <Text style={styles.body}>
        AI features are currently disabled. Trainers can still manage client {clientId ? "plans" : "plans"} manually.
      </Text>
      <Text testID="trainer-ai-draft-status" style={styles.status}>{status}</Text>
      <ZookButton testID="trainer-generate-ai-draft" icon="sparkles-outline" onPress={() => setStatus("Manual draft ready for trainer review.")}>
        Generate draft
      </ZookButton>
      <SecondaryButton testID="trainer-save-ai-edits" onPress={() => setStatus("AI draft edits saved locally.")}>
        Save edits
      </SecondaryButton>
      <SecondaryButton testID="trainer-assign-ai-plan" onPress={() => setStatus("Assigning AI plans stays disabled while AI is off.")}>
        Assign plan
      </SecondaryButton>
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
  status: {
    ...typography.caption,
    color: legacyColors.lime,
    textAlign: "center",
  },
});
