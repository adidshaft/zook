import { useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassCard, SecondaryButton, ZookButton } from "@/components/primitives";
import { spacing, typography, useTheme } from "@/lib/theme";

export function AiDraftPanel({ clientId }: { clientId: string }) {
  const { mode, palette } = useTheme();
  const [status, setStatus] = useState("AI drafting is disabled in local E2E.");
  const isDark = mode === "dark";

  return (
    <GlassCard testID="trainer-ai-draft-screen" contentStyle={styles.lockedCard}>
      <View
        style={[
          styles.lockIcon,
          {
            borderColor: palette.border.focus,
            backgroundColor: palette.surface.accentSoft,
            shadowColor: palette.accent.base,
            shadowOpacity: Platform.OS === "ios" ? (isDark ? 0.18 : 0.08) : 0,
          },
        ]}
      >
        <Ionicons name="lock-closed-outline" size={28} color={palette.accent.base} />
      </View>
      <Text style={[styles.title, { color: palette.text.primary }]}>Feature Locked</Text>
      <Text style={[styles.body, { color: palette.text.secondary }]}>
        AI features are currently disabled. Trainers can still manage client {clientId ? "plans" : "plans"} manually.
      </Text>
      <Text testID="trainer-ai-draft-status" style={[styles.status, { color: palette.accent.base }]}>
        {status}
      </Text>
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
    borderRadius: 24,
    borderWidth: 1,
    height: 56,
    justifyContent: "center",
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    width: 56,
    elevation: 0,
  },
  title: {
    ...typography.h2,
    textAlign: "center",
  },
  body: {
    ...typography.body,
    textAlign: "center",
  },
  status: {
    ...typography.caption,
    textAlign: "center",
  },
});
