import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, SecondaryButton } from "@/components/primitives";
import { elevation, spacing, typography, useTheme } from "@/lib/theme";

export function AiDraftPanel({ clientId }: { clientId: string }) {
  const { mode, palette } = useTheme();
  const router = useRouter();
  const isDark = mode === "dark";
  const lockShadow = elevation(2, palette.accent.base, {
    shadowOpacity: isDark ? 0.18 : 0.08,
  });

  return (
    <Card testID="trainer-ai-draft-screen" contentStyle={styles.lockedCard}>
      <View
        style={[
          styles.lockIcon,
          {
            borderColor: palette.border.focus,
            backgroundColor: palette.surface.accentSoft,
            ...lockShadow,
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
    width: 56,
  },
  title: {
    ...typography.headerTitle,
    textAlign: "center",
  },
  body: {
    ...typography.body,
    textAlign: "center",
  },
});
