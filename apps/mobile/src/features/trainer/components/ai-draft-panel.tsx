import { useRouter } from "expo-router";
import { Platform, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, SecondaryButton } from "@/components/primitives";
import { spacing, typography, useTheme } from "@/lib/theme";

export function AiDraftPanel({ clientId }: { clientId: string }) {
  const { mode, palette } = useTheme();
  const router = useRouter();
  const isDark = mode === "dark";

  return (
    <Card testID="trainer-ai-draft-screen" contentStyle={styles.lockedCard}>
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
      <Text style={[styles.title, { color: palette.text.primary }]}>AI drafting is off</Text>
      <Text style={[styles.body, { color: palette.text.secondary }]}>
        Your gym owner can turn on AI plan drafting in settings. You can still create and edit plans manually.
      </Text>
      <SecondaryButton
        testID="trainer-create-manual-plan"
        icon="reader-outline"
        onPress={() => router.push(`/trainer/clients/${clientId}/plan` as never)}
      >
        Create plan manually
      </SecondaryButton>
    </Card>
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
});
