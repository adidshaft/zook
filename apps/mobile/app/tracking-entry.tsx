import { useRouter, Stack } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { Card, PrimaryButton, Screen } from "@/components/primitives";
import { useAuth, getApiErrorMessage } from "@/lib/auth";
import { mobileApiFetch } from "@/lib/api";
import { colors } from "@/lib/theme";

function defaultStartedAt() {
  const date = new Date();
  date.setMinutes(0, 0, 0);
  return date.toISOString();
}

function defaultEndedAt() {
  const date = new Date();
  date.setHours(date.getHours() + 1);
  date.setMinutes(0, 0, 0);
  return date.toISOString();
}

export default function TrackingEntry() {
  const { activeOrgId, token } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("Strength Session");
  const [workoutType, setWorkoutType] = useState("strength");
  const [startedAt, setStartedAt] = useState(defaultStartedAt());
  const [endedAt, setEndedAt] = useState(defaultEndedAt());
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("Save a session after each workout. ISO time works best in local development.");
  const [saving, setSaving] = useState(false);
  const [exercises, setExercises] = useState([
    { exerciseName: "Bench Press", setsCompleted: "4", reps: "8", weightKg: "60" },
    { exerciseName: "Cable Row", setsCompleted: "4", reps: "10", weightKg: "40" }
  ]);

  async function saveWorkout() {
    if (!token) {
      return;
    }
    setSaving(true);
    try {
      await mobileApiFetch("/me/tracking/workouts", {
        method: "POST",
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: {
          ...(activeOrgId ? { organizationId: activeOrgId } : {}),
          title,
          workoutType,
          startedAt,
          endedAt,
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
              completed: true
            }))
        }
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "tracking", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "tracking", "workouts"] })
      ]);
      setMessage("Workout saved.");
      router.replace("/tracking");
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: "Workout entry" }} />
      <Screen title="Workout entry">
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <Card style={styles.hero}>
            <Text style={styles.heroEyebrow} selectable>
              Persisted session log
            </Text>
            <Text style={styles.heroTitle} selectable>
              Add today's workout
            </Text>
            <Text style={styles.heroBody} selectable>
              Store start and end time, notes, and the exercises you actually completed.
            </Text>
          </Card>

          <Card style={styles.formCard}>
            <Text style={styles.sectionTitle}>Workout</Text>
            <TextInput value={title} onChangeText={setTitle} style={styles.input} placeholder="Workout title" placeholderTextColor={colors.muted} />
            <TextInput value={workoutType} onChangeText={setWorkoutType} style={styles.input} placeholder="Workout type" placeholderTextColor={colors.muted} />
            <TextInput value={startedAt} onChangeText={setStartedAt} style={styles.input} autoCapitalize="none" placeholder="Started at (ISO datetime)" placeholderTextColor={colors.muted} />
            <TextInput value={endedAt} onChangeText={setEndedAt} style={styles.input} autoCapitalize="none" placeholder="Ended at (ISO datetime)" placeholderTextColor={colors.muted} />
            <TextInput
              value={notes}
              onChangeText={setNotes}
              style={[styles.input, styles.notesInput]}
              multiline
              placeholder="Notes"
              placeholderTextColor={colors.muted}
            />
          </Card>

          <Card style={styles.exerciseCard}>
            <Text style={styles.sectionTitle}>Exercises</Text>
            {exercises.map((exercise, index) => (
              <View key={`${exercise.exerciseName}-${index}`} style={styles.exerciseGroup}>
                <TextInput
                  value={exercise.exerciseName}
                  onChangeText={(value) =>
                    setExercises((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, exerciseName: value } : item
                      )
                    )
                  }
                  style={styles.input}
                  placeholder="Exercise"
                  placeholderTextColor={colors.muted}
                />
                <View style={styles.row}>
                  <TextInput
                    value={exercise.setsCompleted}
                    onChangeText={(value) =>
                      setExercises((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, setsCompleted: value } : item
                        )
                      )
                    }
                    style={[styles.input, styles.halfInput]}
                    keyboardType="number-pad"
                    placeholder="Sets"
                    placeholderTextColor={colors.muted}
                  />
                  <TextInput
                    value={exercise.reps}
                    onChangeText={(value) =>
                      setExercises((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, reps: value } : item
                        )
                      )
                    }
                    style={[styles.input, styles.halfInput]}
                    keyboardType="number-pad"
                    placeholder="Reps"
                    placeholderTextColor={colors.muted}
                  />
                  <TextInput
                    value={exercise.weightKg}
                    onChangeText={(value) =>
                      setExercises((current) =>
                        current.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, weightKg: value } : item
                        )
                      )
                    }
                    style={[styles.input, styles.halfInput]}
                    keyboardType="decimal-pad"
                    placeholder="Kg"
                    placeholderTextColor={colors.muted}
                  />
                </View>
              </View>
            ))}
            <PrimaryButton
              onPress={() =>
                setExercises((current) => [
                  ...current,
                  { exerciseName: "", setsCompleted: "", reps: "", weightKg: "" }
                ])
              }
            >
              Add another exercise
            </PrimaryButton>
          </Card>

          <Card style={styles.notesCard}>
            <Text style={styles.notesBody}>{message}</Text>
            <PrimaryButton onPress={() => void saveWorkout()}>
              {saving ? "Saving..." : "Save today's workout"}
            </PrimaryButton>
          </Card>
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40
  },
  hero: {
    gap: 10
  },
  heroEyebrow: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: "800"
  },
  heroTitle: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 36
  },
  heroBody: {
    color: colors.muted,
    lineHeight: 20
  },
  formCard: {
    gap: 12
  },
  exerciseCard: {
    gap: 12
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  input: {
    minHeight: 52,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    paddingHorizontal: 14,
    backgroundColor: "rgba(0,0,0,0.25)"
  },
  notesInput: {
    minHeight: 120,
    paddingTop: 14
  },
  exerciseGroup: {
    gap: 10
  },
  row: {
    flexDirection: "row",
    gap: 10
  },
  halfInput: {
    flex: 1
  },
  notesCard: {
    gap: 14
  },
  notesBody: {
    color: colors.muted,
    lineHeight: 20
  }
});
