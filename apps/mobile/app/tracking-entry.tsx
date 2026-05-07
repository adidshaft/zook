import { useFocusEffect, useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useMemo, useState } from "react";
import { Alert, BackHandler, Keyboard, StyleSheet, Text, View, Pressable } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import {
  BottomNav,
  ChipGroup,
  DatePickerField,
  GlassCard,
  GlassInput,
  IconBubble,
  MobileHeader,
  SectionHeader,
  StickyActionBar,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";
import { useAuth, getApiErrorMessage } from "@/lib/auth";
import { memberApi } from "@/lib/domain-api";
import { colors, layout, spacing, typography } from "@/lib/theme";
import { notifyError, notifySaved } from "@/lib/toast";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";

const workoutTypes = [
  { label: "Strength", value: "strength", icon: "barbell-outline" as const },
  { label: "Cardio", value: "cardio", icon: "bicycle-outline" as const },
  { label: "HIIT", value: "hiit", icon: "flash-outline" as const },
  { label: "Flexibility", value: "flexibility", icon: "body-outline" as const },
  { label: "Yoga", value: "yoga", icon: "leaf-outline" as const },
  { label: "Other", value: "other", icon: "ellipsis-horizontal-outline" as const },
];

function defaultStartedAt() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  return date;
}

function defaultEndedAt() {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  date.setMinutes(0, 0, 0);
  return date;
}

type ExerciseEntry = {
  exerciseName: string;
  setsCompleted: string;
  reps: string;
  weightKg: string;
};

const iconHitSlop = { top: 8, right: 8, bottom: 8, left: 8 };

function emptyExercise(): ExerciseEntry {
  return { exerciseName: "", setsCompleted: "", reps: "", weightKg: "" };
}

export default function TrackingEntry() {
  useHideBottomNav();
  const { activeOrgId, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [workoutType, setWorkoutType] = useState("strength");
  const [startedAt, setStartedAt] = useState(defaultStartedAt());
  const [endedAt, setEndedAt] = useState(defaultEndedAt());
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([emptyExercise()]);
  const scrollPaddingBottom = useBottomScrollPadding({ hasStickyAction: true });
  const dirty = useMemo(
    () =>
      title.trim().length > 0 ||
      notes.trim().length > 0 ||
      exercises.some((exercise) => Object.values(exercise).some((value) => value.trim().length > 0)),
    [exercises, notes, title],
  );

  const confirmDiscard = useCallback(() => {
    if (!dirty || saving) {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace("/tracking");
      }
      return true;
    }
    Alert.alert("Discard workout?", "Unsaved exercise details will be lost.", [
      { text: "Keep editing", style: "cancel" },
      {
        text: "Discard",
        style: "destructive",
        onPress: () => (router.canGoBack() ? router.back() : router.replace("/tracking")),
      },
    ]);
    return true;
  }, [dirty, router, saving]);

  useFocusEffect(
    useCallback(() => {
      const subscription = BackHandler.addEventListener("hardwareBackPress", confirmDiscard);
      return () => subscription.remove();
    }, [confirmDiscard]),
  );

  function updateExercise(index: number, field: keyof ExerciseEntry, value: string) {
    setExercises((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    );
  }

  function addExercise() {
    setExercises((current) => [...current, emptyExercise()]);
  }

  function deleteExercise(index: number) {
    Alert.alert("Delete exercise?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          setExercises((current) =>
            current.length <= 1
              ? [emptyExercise()]
              : current.filter((_, itemIndex) => itemIndex !== index),
          ),
      },
    ]);
  }

  async function saveWorkout() {
    if (!token) {
      return;
    }
    const hasValidExercise = exercises.some(
      (exercise) => exercise.exerciseName.trim().length > 0 && Number(exercise.setsCompleted) > 0,
    );
    if (!hasValidExercise) {
      setMessage("Add at least one exercise with a name and sets greater than 0.");
      notifyError(new Error("Add at least one exercise with a name and sets greater than 0."));
      return;
    }
    if (endedAt <= startedAt) {
      setMessage("End time must be after start time.");
      notifyError(new Error("End time must be after start time."));
      return;
    }
    setSaving(true);
    Keyboard.dismiss();
    try {
      await memberApi.createTrackingWorkout({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: {
          ...(activeOrgId ? { organizationId: activeOrgId } : {}),
          title: title.trim() || "Workout",
          workoutType,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          notes,
          visibility: "PRIVATE",
          exercises: exercises
            .filter((exercise) => exercise.exerciseName.trim().length > 0)
            .map((exercise, index) => ({
              exerciseName: exercise.exerciseName,
              orderIndex: index,
              setsCompleted: Number(exercise.setsCompleted || 0),
              reps: Number(exercise.reps || 0),
              weightKg: Number(exercise.weightKg || 0),
              completed: true,
            })),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "tracking", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "tracking", "workouts"] }),
      ]);
      notifySaved("Workout saved.");
      router.replace("/tracking");
    } catch (error) {
      setMessage(getApiErrorMessage(error));
      notifyError(error, "Workout could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  const durationMinutes = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: [styles.content, { paddingBottom: scrollPaddingBottom }],
          }}
        >
          <MobileHeader
            title="Log workout"
            subtitle={`${durationMinutes} min · ${exercises.length} exercises`}
            leading={
              <Pressable
                onPress={confirmDiscard}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={21} color={colors.text} />
              </Pressable>
            }
            showProfileShortcut={false}
          />

          {/* Workout type picker */}
          <SectionHeader title="Workout type" />
          <ChipGroup
            accessibilityLabel="Workout type"
            disabled={saving}
            options={workoutTypes}
            value={workoutType}
            onChange={setWorkoutType}
          />

          {/* Workout details */}
          <GlassCard contentStyle={styles.formContent}>
            <GlassInput
              label="Session title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Upper body, Leg day"
              returnKeyType="next"
            />

            <View style={styles.dateRow}>
              <DatePickerField
                accessibilityLabel="Workout start date"
                label="Start"
                value={startedAt}
                onChange={setStartedAt}
              />
              <DatePickerField
                accessibilityLabel="Workout end date"
                label="End"
                value={endedAt}
                onChange={setEndedAt}
              />
            </View>

            <GlassInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="How did it feel? Any injuries?"
              returnKeyType="done"
            />
          </GlassCard>

          {/* Exercises */}
          <SectionHeader
            title="Exercises"
            action={
              <Pressable
                onPress={addExercise}
                accessibilityRole="button"
                accessibilityLabel="Add exercise"
                hitSlop={iconHitSlop}
                style={styles.addButton}
              >
                <Ionicons name="add" size={20} color={colors.bg} />
              </Pressable>
            }
          />

          <View style={styles.exerciseStack}>
            {exercises.map((exercise, index) => (
              <GlassCard key={`exercise-${index}`} variant="compact" contentStyle={styles.exerciseContent}>
                <View style={styles.exerciseHeader}>
                  <IconBubble icon="barbell-outline" tone="lime" size={36} />
                  <GlassInput
                    label={`Exercise ${index + 1}`}
                    value={exercise.exerciseName}
                    onChangeText={(value) => updateExercise(index, "exerciseName", value)}
                    maxLength={64}
                    placeholder="Exercise name"
                    returnKeyType="next"
                    style={styles.exerciseNameInput}
                  />
                  {exercise.exerciseName.length > 50 ? (
                    <Text style={styles.counter}>{exercise.exerciseName.length}/64</Text>
                  ) : null}
                  <Pressable
                    onPress={() => deleteExercise(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Delete ${exercise.exerciseName || "exercise"}`}
                    hitSlop={iconHitSlop}
                    style={styles.deleteButton}
                  >
                    <Ionicons name="close" size={16} color={colors.red} />
                  </Pressable>
                </View>
                <View style={styles.exerciseMetrics}>
                  <GlassInput
                    label="Sets"
                    value={exercise.setsCompleted}
                    onChangeText={(value) =>
                      updateExercise(index, "setsCompleted", value.replace(/\D/g, ""))
                    }
                    keyboardType="number-pad"
                    placeholder="3"
                    returnKeyType="next"
                    style={styles.metricInput}
                  />
                  <GlassInput
                    label="Reps per set"
                    value={exercise.reps}
                    onChangeText={(value) => updateExercise(index, "reps", value.replace(/\D/g, ""))}
                    keyboardType="number-pad"
                    placeholder="8"
                    returnKeyType="next"
                    style={styles.metricInput}
                  />
                  <GlassInput
                    label="Weight (kg)"
                    value={exercise.weightKg}
                    onChangeText={(value) =>
                      updateExercise(index, "weightKg", value.replace(/[^\d.]/g, ""))
                    }
                    keyboardType="decimal-pad"
                    placeholder="0"
                    returnKeyType="done"
                    style={styles.metricInput}
                  />
                </View>
              </GlassCard>
            ))}
          </View>

          {message ? (
            <Text style={styles.statusMessage}>{message}</Text>
          ) : null}

        </KeyboardAwareScreen>
        <StickyActionBar>
          <ZookButton
            onPress={() => void saveWorkout()}
            disabled={saving}
            busy={saving}
            busyLabel="Saving"
            icon="checkmark-circle-outline"
          >
            {saving ? "Saving..." : "Save workout"}
          </ZookButton>
        </StickyActionBar>
        <BottomNav />
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 14,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  typeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  typeChip: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  typeChipActive: {
    borderColor: colors.lime,
    backgroundColor: colors.lime,
  },
  typeChipText: {
    color: colors.muted,
    ...typography.caption,
  },
  typeChipTextActive: {
    color: colors.bg,
  },
  formContent: {
    gap: spacing.md,
  },
  dateRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  dateField: {
    flex: 1,
    gap: 6,
  },
  fieldLabel: {
    color: colors.muted,
    ...typography.caption,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
  },
  dateValue: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  exerciseStack: {
    gap: 10,
  },
  exerciseContent: {
    gap: spacing.sm,
  },
  exerciseHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  exerciseNameInput: {
    flex: 1,
  },
  counter: {
    color: colors.muted,
    ...typography.caption,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,90,61,0.28)",
    backgroundColor: "rgba(255,90,61,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseMetrics: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  metricInput: {
    flex: 1,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  statusMessage: {
    color: colors.lime,
    ...typography.body,
    paddingHorizontal: 4,
  },
});
