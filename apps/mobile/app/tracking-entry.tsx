import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import { FormField, MobileHeader, QueryErrorState, SectionHeader, ZookButton, ZookScreen } from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { memberApi } from "@/lib/domain-api";
import { queryKeys } from "@/lib/domains/shared/keys";
import { layout, spacing } from "@/lib/theme";
import { showToast } from "@/lib/toast";

export default function TrackingEntryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrgId, token } = useAuth();
  const [title, setTitle] = useState("");
  const [exerciseName, setExerciseName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [error, setError] = useState<Error | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveWorkout() {
    if (!token || saving) return;
    setSaving(true);
    setError(null);
    try {
      const startedAt = new Date();
      const endedAt = new Date(startedAt.getTime() + 45 * 60_000);
      await memberApi.createTrackingWorkout({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: {
          ...(activeOrgId ? { organizationId: activeOrgId } : {}),
          title: title.trim() || "Logged workout",
          workoutType: "Strength",
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          intensity: "Moderate",
          visibility: "TRAINER_VISIBLE",
          exercises: [
            {
              exerciseName: exerciseName.trim() || "Workout set",
              orderIndex: 0,
              setsCompleted: Number.parseInt(sets, 10) || 0,
              reps: Number.parseInt(reps, 10) || 0,
              completed: true,
            },
          ],
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tracking.summary() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tracking.workouts() }),
      ]);
      showToast({ tone: "success", haptic: "success", message: "Workout saved." });
      router.replace("/tracking" as never);
    } catch (caught) {
      const nextError = new Error(getApiErrorMessage(caught));
      setError(nextError);
      showToast({ title: "Could not save workout", message: nextError.message, tone: "danger", haptic: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="tracking-entry-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Log workout" subtitle="Add a completed session" showProfileShortcut={false} />
          {error ? <QueryErrorState error={error} onRetry={() => void saveWorkout()} /> : null}
          <SectionHeader title="Session" />
          <FormField testID="tracking-entry-title" label="Workout title" value={title} onChangeText={setTitle} placeholder="Maestro workout" />
          <SectionHeader title="Exercise" />
          <FormField testID="tracking-entry-exercise-0-name" label="Exercise name" value={exerciseName} onChangeText={setExerciseName} placeholder="Push press" />
          <FormField testID="tracking-entry-exercise-0-sets" label="Sets" value={sets} onChangeText={setSets} keyboardType="number-pad" placeholder="3" />
          <FormField testID="tracking-entry-exercise-0-reps" label="Reps" value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="8" />
          <ZookButton testID="tracking-entry-save" onPress={() => void saveWorkout()} busy={saving} busyLabel="Saving..." icon="save-outline">
            Save workout
          </ZookButton>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: 14, width: "100%" },
});
