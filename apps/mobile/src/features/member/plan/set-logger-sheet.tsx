import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { LinearGradient } from "@/components/primitives/linear-gradient";
import { ExerciseRow } from "@/components/primitives";
import { ProgressBar } from "@/components/primitives/progress-bar";
import { gradients, gradientsLight, radii, spacing, typography, useTheme } from "@/lib/theme";

import type { PlanExerciseDraft } from "./plan-detail-storage";

export type RestTimerState = {
  exerciseName: string;
  durationSeconds: number;
  remainingSeconds: number;
  endsAt: number;
};

export function formatRestTime(totalSeconds: number) {
  const seconds = Math.max(0, Math.ceil(totalSeconds));
  const minutes = Math.floor(seconds / 60);
  const remainder = `${seconds % 60}`.padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function SetLoggerSheet({
  add15Label,
  completed,
  exercises,
  restTimer,
  showRestBar = true,
  skipLabel,
  title,
  onAddRestSeconds,
  onSkipRest,
  onToggleExercise,
}: {
  add15Label: string;
  completed: Set<string>;
  exercises: PlanExerciseDraft[];
  restTimer: RestTimerState | null;
  showRestBar?: boolean;
  skipLabel: string;
  title: string;
  onAddRestSeconds: () => void;
  onSkipRest: () => void;
  onToggleExercise: (exercise: PlanExerciseDraft) => void;
}) {
  return (
    <View style={styles.shell}>
      {showRestBar ? (
        <RestTimerBar
          add15Label={add15Label}
          restTimer={restTimer}
          skipLabel={skipLabel}
          title={title}
          onAddRestSeconds={onAddRestSeconds}
          onSkipRest={onSkipRest}
        />
      ) : null}

      {exercises.map((exercise, index) => (
        <ExerciseRow
          key={`${exercise.name}-${index}`}
          title={exercise.name}
          sets={exercise.sets}
          detail={`${exercise.equipment} · ${exercise.reps}`}
          compact
          complete={completed.has(exercise.name)}
          onPress={() => onToggleExercise(exercise)}
        />
      ))}
    </View>
  );
}

export function RestTimerBar({
  add15Label,
  restTimer,
  skipLabel,
  title,
  onAddRestSeconds,
  onSkipRest,
}: {
  add15Label: string;
  restTimer: RestTimerState | null;
  skipLabel: string;
  title: string;
  onAddRestSeconds: () => void;
  onSkipRest: () => void;
}) {
  const { mode, palette } = useTheme();
  if (!restTimer) {
    return null;
  }
  const restProgress = restTimer.remainingSeconds / Math.max(restTimer.durationSeconds, 1);
  const heroGradient = mode === "light" ? gradientsLight.heroCard : gradients.heroCard;

  return (
    <LinearGradient colors={heroGradient} style={[styles.restBar, { borderColor: palette.accent.strong }]}>
      <View style={styles.restCopy}>
        <View style={styles.restTitleRow}>
          <Ionicons name="timer-outline" size={17} color={palette.accent.base} />
          <Text numberOfLines={1} style={[styles.restTitle, { color: palette.text.primary }]}>
            {title}
          </Text>
        </View>
        <Text numberOfLines={1} style={[styles.restExercise, { color: palette.text.secondary }]}>
          {restTimer.exerciseName}
        </Text>
      </View>
      <View style={styles.restMeter}>
        <Text style={[styles.restCountdown, { color: palette.accent.base }]}>
          {formatRestTime(restTimer.remainingSeconds)}
        </Text>
        <ProgressBar value={restProgress} tone="lime" />
      </View>
      <View style={styles.restActions}>
        <Pressable
          onPress={onAddRestSeconds}
          accessibilityRole="button"
          accessibilityLabel={add15Label}
          style={({ pressed }) => [
            styles.restActionButton,
            { borderColor: palette.border.default, backgroundColor: palette.surface.raised },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.restActionText, { color: palette.text.primary }]}>{add15Label}</Text>
        </Pressable>
        <Pressable
          onPress={onSkipRest}
          accessibilityRole="button"
          accessibilityLabel={skipLabel}
          style={({ pressed }) => [
            styles.restActionButton,
            { borderColor: palette.border.default, backgroundColor: palette.surface.raised },
            pressed ? styles.pressed : null,
          ]}
        >
          <Text style={[styles.restActionText, { color: palette.text.primary }]}>{skipLabel}</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: spacing.sm,
  },
  restBar: {
    borderRadius: radii.large,
    borderWidth: 1,
    gap: spacing.sm,
    padding: spacing.md,
  },
  restCopy: {
    gap: 2,
  },
  restTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  restTitle: {
    ...typography.cardTitle,
  },
  restExercise: {
    ...typography.caption,
  },
  restMeter: {
    gap: spacing.xs,
  },
  restCountdown: {
    ...typography.timer,
  },
  restActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  restActionButton: {
    alignItems: "center",
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 38,
    paddingHorizontal: spacing.md,
  },
  restActionText: {
    ...typography.bodyStrong,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
});
