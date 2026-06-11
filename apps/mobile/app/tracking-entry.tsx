import { useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ScrollView, StyleSheet } from "react-native";

import {
  FormField,
  MobileHeader,
  QueryErrorState,
  SectionHeader,
  SegmentedControl,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { memberApi, trackingApi } from "@/lib/domain-api";
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
  const [mode, setMode] = useState<"workout" | "body">("workout");
  const [weightKg, setWeightKg] = useState("");
  const [bodyFatPercent, setBodyFatPercent] = useState("");
  const [muscleMassKg, setMuscleMassKg] = useState("");
  const [waistCm, setWaistCm] = useState("");
  const [hipCm, setHipCm] = useState("");
  const [chestCm, setChestCm] = useState("");
  const [shoulderCm, setShoulderCm] = useState("");
  const [armCm, setArmCm] = useState("");
  const [forearmCm, setForearmCm] = useState("");
  const [thighCm, setThighCm] = useState("");
  const [calfCm, setCalfCm] = useState("");
  const [neckCm, setNeckCm] = useState("");
  const [visceralFatRating, setVisceralFatRating] = useState("");
  const [restingHeartRate, setRestingHeartRate] = useState("");
  const [notes, setNotes] = useState("");
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

  function numeric(value: string) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  async function saveBodyProgress() {
    if (!token || saving) return;
    setSaving(true);
    setError(null);
    try {
      await trackingApi.recordBodyProgress({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: {
          measuredAt: new Date().toISOString(),
          ...(activeOrgId ? { organizationId: activeOrgId } : {}),
          weightKg: numeric(weightKg),
          bodyFatPercent: numeric(bodyFatPercent),
          muscleMassKg: numeric(muscleMassKg),
          waistCm: numeric(waistCm),
          hipCm: numeric(hipCm),
          chestCm: numeric(chestCm),
          shoulderCm: numeric(shoulderCm),
          armCm: numeric(armCm),
          forearmCm: numeric(forearmCm),
          thighCm: numeric(thighCm),
          calfCm: numeric(calfCm),
          neckCm: numeric(neckCm),
          visceralFatRating: numeric(visceralFatRating),
          restingHeartRate: numeric(restingHeartRate),
          notes: notes.trim() || undefined,
          visibility: "TRAINER_VISIBLE",
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tracking.summary() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tracking.bodyProgress() }),
      ]);
      showToast({ tone: "success", haptic: "success", message: "Body measurements saved." });
      router.replace("/tracking" as never);
    } catch (caught) {
      const nextError = new Error(getApiErrorMessage(caught));
      setError(nextError);
      showToast({ title: "Could not save measurements", message: nextError.message, tone: "danger", haptic: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ZookScreen testID="tracking-entry-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title={mode === "workout" ? "Log workout" : "Body measurements"} subtitle={mode === "workout" ? "Add a completed session" : "Track body composition"} showProfileShortcut={false} />
          <SegmentedControl
            options={[
              { value: "workout", label: "Workout" },
              { value: "body", label: "Body" },
            ]}
            value={mode}
            onChange={(value) => setMode(value as "workout" | "body")}
          />
          {error ? <QueryErrorState error={error} onRetry={() => void (mode === "workout" ? saveWorkout() : saveBodyProgress())} /> : null}
          {mode === "workout" ? (
            <>
              <SectionHeader title="Session" />
              <FormField testID="tracking-entry-title" label="Workout title" value={title} onChangeText={setTitle} placeholder="Maestro workout" />
              <SectionHeader title="Exercise" />
              <FormField testID="tracking-entry-exercise-0-name" label="Exercise name" value={exerciseName} onChangeText={setExerciseName} placeholder="Push press" />
              <FormField testID="tracking-entry-exercise-0-sets" label="Sets" value={sets} onChangeText={setSets} keyboardType="number-pad" placeholder="3" />
              <FormField testID="tracking-entry-exercise-0-reps" label="Reps" value={reps} onChangeText={setReps} keyboardType="number-pad" placeholder="8" />
              <ZookButton testID="tracking-entry-save" onPress={() => void saveWorkout()} busy={saving} busyLabel="Saving..." icon="save-outline">
                Save workout
              </ZookButton>
            </>
          ) : (
            <>
              <SectionHeader title="Body measurements" />
              <FormField testID="tracking-body-weight" label="Weight kg" value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" placeholder="72.5" />
              <FormField label="Body fat %" value={bodyFatPercent} onChangeText={setBodyFatPercent} keyboardType="decimal-pad" placeholder="18" />
              <FormField label="Muscle mass kg" value={muscleMassKg} onChangeText={setMuscleMassKg} keyboardType="decimal-pad" placeholder="34" />
              <FormField label="Waist cm" value={waistCm} onChangeText={setWaistCm} keyboardType="decimal-pad" placeholder="82" />
              <FormField label="Hips cm" value={hipCm} onChangeText={setHipCm} keyboardType="decimal-pad" placeholder="96" />
              <FormField label="Chest cm" value={chestCm} onChangeText={setChestCm} keyboardType="decimal-pad" placeholder="101" />
              <FormField label="Shoulders cm" value={shoulderCm} onChangeText={setShoulderCm} keyboardType="decimal-pad" placeholder="118" />
              <FormField label="Arms cm" value={armCm} onChangeText={setArmCm} keyboardType="decimal-pad" placeholder="34" />
              <FormField label="Forearms cm" value={forearmCm} onChangeText={setForearmCm} keyboardType="decimal-pad" placeholder="28" />
              <FormField label="Thighs cm" value={thighCm} onChangeText={setThighCm} keyboardType="decimal-pad" placeholder="56" />
              <FormField label="Calves cm" value={calfCm} onChangeText={setCalfCm} keyboardType="decimal-pad" placeholder="37" />
              <FormField label="Neck cm" value={neckCm} onChangeText={setNeckCm} keyboardType="decimal-pad" placeholder="39" />
              <FormField label="Visceral fat rating" value={visceralFatRating} onChangeText={setVisceralFatRating} keyboardType="number-pad" placeholder="7" />
              <FormField label="Resting heart rate" value={restingHeartRate} onChangeText={setRestingHeartRate} keyboardType="number-pad" placeholder="62" />
              <FormField label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="Front/side/back photos can be attached from progress photos." />
              <ZookButton testID="tracking-body-save" onPress={() => void saveBodyProgress()} busy={saving} busyLabel="Saving..." icon="save-outline">
                Save measurements
              </ZookButton>
            </>
          )}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: 14, width: "100%" },
});
