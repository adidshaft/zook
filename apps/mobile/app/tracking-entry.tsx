import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, View, Platform, Pressable } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useQueryClient } from "@tanstack/react-query";
import {
  BottomNav,
  GlassCard,
  GlassInput,
  IconBubble,
  MobileHeader,
  SectionHeader,
  StickyActionBar,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { useAuth, getApiErrorMessage } from "@/lib/auth";
import { memberApi } from "@/lib/domain-api";
import { colors, layout, spacing, typography } from "@/lib/theme";

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
  const { activeOrgId, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [workoutType, setWorkoutType] = useState("strength");
  const [startedAt, setStartedAt] = useState(defaultStartedAt());
  const [endedAt, setEndedAt] = useState(defaultEndedAt());
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [exercises, setExercises] = useState<ExerciseEntry[]>([emptyExercise()]);

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
    setExercises((current) =>
      current.length <= 1 ? [emptyExercise()] : current.filter((_, itemIndex) => itemIndex !== index),
    );
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
      return;
    }
    if (endedAt <= startedAt) {
      setMessage("End time must be after start time.");
      return;
    }
    setSaving(true);
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
      setMessage("Workout saved.");
      router.replace("/tracking");
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  const durationMinutes = Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            title="Log workout"
            subtitle={`${durationMinutes} min · ${exercises.length} exercises`}
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/tracking")}
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
          <View style={styles.typeGrid}>
            {workoutTypes.map((type) => {
              const active = workoutType === type.value;
              return (
                <Pressable
                  key={type.value}
                  onPress={() => setWorkoutType(type.value)}
                  accessibilityRole="button"
                  accessibilityLabel={type.label}
                  style={[styles.typeChip, active ? styles.typeChipActive : null]}
                >
                  <Ionicons
                    name={type.icon}
                    size={18}
                    color={active ? colors.bg : colors.muted}
                  />
                  <Text style={[styles.typeChipText, active ? styles.typeChipTextActive : null]}>
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Workout details */}
          <GlassCard contentStyle={styles.formContent}>
            <GlassInput
              label="Session title"
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Upper body, Leg day"
            />

            <View style={styles.dateRow}>
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>Start</Text>
                {Platform.OS === "ios" ? (
                  <DateTimePicker
                    value={startedAt}
                    mode="datetime"
                    display="default"
                    themeVariant="dark"
                    onChange={(_, date) => {
                      if (date) setStartedAt(date);
                    }}
                  />
                ) : (
                  <>
                    <Pressable style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
                      <Ionicons name="time-outline" size={16} color={colors.muted} />
                      <Text style={styles.dateValue}>{startedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                    </Pressable>
                    {showStartPicker ? (
                      <DateTimePicker
                        value={startedAt}
                        mode="datetime"
                        display="default"
                        onChange={(_, date) => {
                          setShowStartPicker(false);
                          if (date) setStartedAt(date);
                        }}
                      />
                    ) : null}
                  </>
                )}
              </View>
              <View style={styles.dateField}>
                <Text style={styles.fieldLabel}>End</Text>
                {Platform.OS === "ios" ? (
                  <DateTimePicker
                    value={endedAt}
                    mode="datetime"
                    display="default"
                    themeVariant="dark"
                    onChange={(_, date) => {
                      if (date) setEndedAt(date);
                    }}
                  />
                ) : (
                  <>
                    <Pressable style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
                      <Ionicons name="time-outline" size={16} color={colors.muted} />
                      <Text style={styles.dateValue}>{endedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
                    </Pressable>
                    {showEndPicker ? (
                      <DateTimePicker
                        value={endedAt}
                        mode="datetime"
                        display="default"
                        onChange={(_, date) => {
                          setShowEndPicker(false);
                          if (date) setEndedAt(date);
                        }}
                      />
                    ) : null}
                  </>
                )}
              </View>
            </View>

            <GlassInput
              label="Notes"
              value={notes}
              onChangeText={setNotes}
              multiline
              placeholder="How did it feel? Any injuries?"
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
                    placeholder="Exercise name"
                    style={styles.exerciseNameInput}
                  />
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
                    style={styles.metricInput}
                  />
                  <GlassInput
                    label="Reps per set"
                    value={exercise.reps}
                    onChangeText={(value) => updateExercise(index, "reps", value.replace(/\D/g, ""))}
                    keyboardType="number-pad"
                    placeholder="8"
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
                    style={styles.metricInput}
                  />
                </View>
              </GlassCard>
            ))}
          </View>

          {message ? (
            <Text style={styles.statusMessage}>{message}</Text>
          ) : null}

        </ScrollView>
        <StickyActionBar>
          <ZookButton
            onPress={() => void saveWorkout()}
            disabled={saving}
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
    paddingBottom: layout.bottomNavContentPadding + layout.stickyActionHeight,
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
