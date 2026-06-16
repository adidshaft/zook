import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Card } from "./foundation";
import { ListRow } from "./input-primitives";
import { spacing, typography, useTheme } from "@/lib/theme";

export type SetupChecklistStep = {
  id: string;
  label: string;
  done: boolean;
  onPress: () => void;
};

export function SetupChecklist({
  title,
  steps,
  progressLabel,
}: {
  title: string;
  steps: SetupChecklistStep[];
  progressLabel?: string;
}) {
  const { palette } = useTheme();
  const doneCount = steps.filter((step) => step.done).length;
  const progress = steps.length ? doneCount / steps.length : 0;
  const resolvedProgressLabel = progressLabel ?? `${doneCount} of ${steps.length} complete`;

  return (
    <Card contentStyle={styles.content}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.text.primary }]}>{title}</Text>
        <Text style={[styles.progressLabel, { color: palette.text.secondary }]}>
          {resolvedProgressLabel}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: palette.bg.sunken }]}>
        <View
          style={[
            styles.fill,
            { backgroundColor: palette.accent.fill, width: `${Math.round(progress * 100)}%` },
          ]}
        />
      </View>
      <View style={styles.steps}>
        {steps.map((step) => (
          <Pressable
            key={step.id}
            onPress={step.onPress}
            accessibilityRole="button"
            accessibilityLabel={step.label}
            style={({ pressed }) => [styles.stepPressable, pressed ? styles.pressed : null]}
          >
            <ListRow
              title={step.label}
              leading={
                <Ionicons
                  name={step.done ? "checkmark-circle" : "ellipse-outline"}
                  size={22}
                  color={step.done ? palette.feedback.success : palette.text.tertiary}
                />
              }
              trailing={<Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />}
            />
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...typography.cardTitle,
  },
  progressLabel: {
    ...typography.small,
  },
  track: {
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
  },
  fill: {
    borderRadius: 999,
    height: "100%",
  },
  steps: {
    gap: spacing.xs,
  },
  stepPressable: {
    borderRadius: 18,
  },
  pressed: {
    opacity: 0.86,
  },
});
