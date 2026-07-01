import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Card, IconBubble, Pill } from "@/components/primitives";
import type { TrainerClientRecord } from "@/lib/domains";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";
import { fitnessGoalFor } from "../helpers";

export function PlanRow({ actionLabel, client }: { actionLabel?: string; client: TrainerClientRecord }) {
  const router = useRouter();
  const t = useT();
  const { palette } = useTheme();
  const activePlans = client.summary?.activePlans ?? 0;
  const planLabel = activePlans === 1 ? t("trainer.home.plan") : t("trainer.home.plans");
  const fitnessGoal = fitnessGoalFor(client, t("trainer.clients.generalFitness"));
  const rowActionLabel = actionLabel ?? t("trainer.clients.activePlanCount", {
    count: activePlans,
    label: planLabel,
  });
  const compactPlanLabel = `${activePlans}`;
  const href = `/trainer/clients/${client.memberUserId}/plan` as never;

  return (
    <Card variant="compact" padding={14}>
      <Pressable
        testID={`trainer-client-detail-${client.memberUserId}`}
        accessibilityRole="button"
        accessibilityLabel={actionLabel ?? t("trainer.plans.clientDetail")}
        onPress={() => router.push(href)}
        style={({ pressed }) => [styles.row, pressed ? styles.rowPressed : null]}
      >
        <IconBubble icon={activePlans ? "reader-outline" : "add"} tone={activePlans ? "blue" : "amber"} size={42} />
        <View style={styles.copy}>
          <Text numberOfLines={1} style={[styles.name, { color: palette.text.primary }]}>
            {client.user?.name ?? t("trainer.home.clientFallback")}
          </Text>
          <Text numberOfLines={1} style={[styles.meta, { color: palette.text.secondary }]}>
            {`${fitnessGoal} · ${rowActionLabel}`}
          </Text>
        </View>
        <View style={styles.trailing}>
          <Pill tone={activePlans ? "blue" : "amber"}>
            {compactPlanLabel}
          </Pill>
          <Ionicons name="chevron-forward" size={18} color={palette.text.secondary} />
        </View>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  rowPressed: { opacity: 0.78 },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  name: { ...typography.cardTitle },
  meta: { ...typography.small },
  trailing: { alignItems: "center", flexDirection: "row", flexShrink: 0, gap: spacing.xs },
});
