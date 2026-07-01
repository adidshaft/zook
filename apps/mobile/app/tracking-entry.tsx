import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  FormField,
  AppHeader,
  QueryErrorState,
  SectionHeader,
  SegmentedControl,
  StickyActionBar,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { memberApi, trackingApi } from "@/lib/domain-api";
import { queryKeys } from "@/lib/domains/shared/keys";
import { useT } from "@/lib/i18n";
import { useBottomScrollPadding } from "@/lib/use-layout-padding";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

export default function TrackingEntryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string | string[] }>();
  const queryClient = useQueryClient();
  const bottomPadding = useBottomScrollPadding();
  const { palette } = useTheme();
  const { activeOrgId, token } = useAuth();
  const t = useT();
  const [title, setTitle] = useState("");
  const [exercises, setExercises] = useState([{ name: "", sets: "", reps: "" }]);
  const [durationMinutes, setDurationMinutes] = useState("45");
  const [mode, setMode] = useState<"workout" | "body">("workout");
  const [showMoreMeasurements, setShowMoreMeasurements] = useState(false);
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
  const workoutExercises = exercises.filter((exercise) => exercise.name.trim());
  const canSaveWorkout = workoutExercises.length > 0;
  const bodyMeasurementValues = [
    weightKg,
    bodyFatPercent,
    muscleMassKg,
    waistCm,
    hipCm,
    chestCm,
    shoulderCm,
    armCm,
    forearmCm,
    thighCm,
    calfCm,
    neckCm,
    visceralFatRating,
    restingHeartRate,
  ];
  const canSaveBodyProgress = bodyMeasurementValues.some((value) => numeric(value) !== undefined);

  useEffect(() => {
    const requestedMode = Array.isArray(params.mode) ? params.mode[0] : params.mode;
    if (requestedMode === "body" || requestedMode === "workout") {
      setMode(requestedMode);
    }
  }, [params.mode]);

  async function saveWorkout() {
    if (!token || saving || !canSaveWorkout) return;
    setSaving(true);
    setError(null);
    try {
      const startedAt = new Date();
      const duration = Math.max(1, Number.parseInt(durationMinutes, 10) || 45);
      const endedAt = new Date(startedAt.getTime() + duration * 60_000);
      await memberApi.createTrackingWorkout({
        token,
        ...(activeOrgId ? { orgId: activeOrgId } : {}),
        body: {
          ...(activeOrgId ? { organizationId: activeOrgId } : {}),
          title: title.trim() || t("tracking.loggedWorkout"),
          workoutType: t("tracking.strength"),
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          intensity: "Moderate",
          visibility: "TRAINER_VISIBLE",
          exercises: workoutExercises.map((exercise, index) => ({
            exerciseName: exercise.name.trim(),
            orderIndex: index,
            setsCompleted: Number.parseInt(exercise.sets, 10) || 0,
            reps: Number.parseInt(exercise.reps, 10) || 0,
            completed: true,
          })),
        },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.tracking.summary() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.tracking.workouts() }),
      ]);
      showToast({ tone: "success", haptic: "success", message: t("tracking.workoutSaved") });
      router.replace("/progress" as never);
    } catch (caught) {
      const nextError = new Error(getApiErrorMessage(caught));
      setError(nextError);
      showToast({ title: t("tracking.couldNotSaveWorkout"), message: nextError.message, tone: "danger", haptic: "error" });
    } finally {
      setSaving(false);
    }
  }

  function numeric(value: string) {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function updateExercise(index: number, patch: Partial<(typeof exercises)[number]>) {
    setExercises((current) =>
      current.map((exercise, candidateIndex) =>
        candidateIndex === index ? { ...exercise, ...patch } : exercise,
      ),
    );
  }

  function addExercise() {
    setExercises((current) => [...current, { name: "", sets: "", reps: "" }]);
  }

  function removeExercise(index: number) {
    setExercises((current) => current.filter((_, candidateIndex) => candidateIndex !== index));
  }

  async function saveBodyProgress() {
    if (!token || saving || !canSaveBodyProgress) return;
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
      showToast({ tone: "success", haptic: "success", message: t("tracking.bodyMeasurementsSaved") });
      router.replace("/progress" as never);
    } catch (caught) {
      const nextError = new Error(getApiErrorMessage(caught));
      setError(nextError);
      showToast({ title: t("tracking.couldNotSaveMeasurements"), message: nextError.message, tone: "danger", haptic: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ZookScreen testID="tracking-entry-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: bottomPadding + layout.stickyActionHeight },
          ]}
        >
          <AppHeader title={mode === "workout" ? t("member.progress.logWorkout") : t("tracking.bodyMeasurements")} showBack />
          <SegmentedControl
            options={[
              { value: "workout", label: t("tracking.workout") },
              { value: "body", label: t("tracking.body") },
            ]}
            value={mode}
            onChange={(value) => setMode(value as "workout" | "body")}
          />
          {error ? <QueryErrorState error={error} onRetry={() => void (mode === "workout" ? saveWorkout() : saveBodyProgress())} /> : null}
          {mode === "workout" ? (
            <>
              <SectionHeader title={t("tracking.session")} />
              <FormField testID="tracking-entry-title" label={t("tracking.workoutTitle")} value={title} onChangeText={setTitle} placeholder={t("tracking.workoutTitlePlaceholder")} />
              <FormField testID="tracking-entry-duration" label={t("tracking.durationMinutes")} value={durationMinutes} onChangeText={setDurationMinutes} keyboardType="number-pad" placeholder="45" />
              <View style={styles.sectionActionRow}>
                <SectionHeader title={t("tracking.exercise")} />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("tracking.addExercise")}
                  onPress={addExercise}
                  hitSlop={8}
                  style={({ pressed }) => [
                    styles.iconAction,
                    { backgroundColor: palette.surface.raised, borderColor: palette.border.default },
                    pressed ? styles.iconActionPressed : null,
                  ]}
                >
                  <Ionicons name="add-outline" size={19} color={palette.text.primary} />
                </Pressable>
              </View>
              {exercises.map((exercise, index) => (
                <View key={index} style={styles.exerciseGroup}>
                  <View style={styles.exerciseHeaderRow}>
                    <Text style={[styles.exerciseIndex, { color: palette.text.secondary }]}>
                      #{index + 1}
                    </Text>
                    {exercises.length > 1 ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t("tracking.removeExercise")}
                        onPress={() => removeExercise(index)}
                        hitSlop={8}
                        style={({ pressed }) => [
                          styles.iconAction,
                          { backgroundColor: palette.surface.default, borderColor: palette.border.subtle },
                          pressed ? styles.iconActionPressed : null,
                        ]}
                      >
                        <Ionicons name="trash-outline" size={18} color={palette.feedback.danger} />
                      </Pressable>
                    ) : null}
                  </View>
                  <FormField
                    testID={`tracking-entry-exercise-${index}-name`}
                    label={t("tracking.exerciseName")}
                    value={exercise.name}
                    onChangeText={(value) => updateExercise(index, { name: value })}
                    placeholder={t("tracking.exerciseNamePlaceholder")}
                  />
                  <View style={styles.exerciseNumbers}>
                    <FormField
                      testID={`tracking-entry-exercise-${index}-sets`}
                      label={t("tracking.sets")}
                      value={exercise.sets}
                      onChangeText={(value) => updateExercise(index, { sets: value })}
                      keyboardType="number-pad"
                      placeholder="3"
                      style={styles.exerciseNumberField}
                    />
                    <FormField
                      testID={`tracking-entry-exercise-${index}-reps`}
                      label={t("tracking.reps")}
                      value={exercise.reps}
                      onChangeText={(value) => updateExercise(index, { reps: value })}
                      keyboardType="number-pad"
                      placeholder="8"
                      style={styles.exerciseNumberField}
                    />
                  </View>
                </View>
              ))}
              {!canSaveWorkout ? (
                <Text style={[styles.helperText, { color: palette.text.secondary }]}>
                  {t("tracking.addExerciseToSave")}
                </Text>
              ) : null}
            </>
          ) : (
            <>
              <FormField testID="tracking-body-weight" label={t("tracking.weightKg")} value={weightKg} onChangeText={setWeightKg} keyboardType="decimal-pad" placeholder="72.5" />
              <FormField label={t("tracking.bodyFatPercent")} value={bodyFatPercent} onChangeText={setBodyFatPercent} keyboardType="decimal-pad" placeholder="18" />
              <FormField label={t("tracking.waistCm")} value={waistCm} onChangeText={setWaistCm} keyboardType="decimal-pad" placeholder="82" />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  showMoreMeasurements
                    ? t("tracking.hideMeasurements")
                    : t("tracking.moreMeasurements")
                }
                onPress={() => setShowMoreMeasurements((current) => !current)}
                style={({ pressed }) => [
                  styles.moreMeasurementsButton,
                  {
                    borderColor: palette.border.default,
                    backgroundColor: palette.surface.raised,
                  },
                  pressed ? styles.moreMeasurementsButtonPressed : null,
                ]}
              >
                <Ionicons
                  name={showMoreMeasurements ? "chevron-up" : "chevron-down"}
                  size={16}
                  color={palette.text.secondary}
                />
                <Text style={[styles.moreMeasurementsText, { color: palette.text.secondary }]}>
                  {showMoreMeasurements
                    ? t("tracking.hideMeasurements")
                    : t("tracking.moreMeasurements")}
                </Text>
              </Pressable>
              {showMoreMeasurements ? (
                <View style={styles.advancedMeasurements}>
                  <FormField label={t("tracking.muscleMassKg")} value={muscleMassKg} onChangeText={setMuscleMassKg} keyboardType="decimal-pad" placeholder="34" />
                  <FormField label={t("tracking.hipsCm")} value={hipCm} onChangeText={setHipCm} keyboardType="decimal-pad" placeholder="96" />
                  <FormField label={t("tracking.chestCm")} value={chestCm} onChangeText={setChestCm} keyboardType="decimal-pad" placeholder="101" />
                  <FormField label={t("tracking.shouldersCm")} value={shoulderCm} onChangeText={setShoulderCm} keyboardType="decimal-pad" placeholder="118" />
                  <FormField label={t("tracking.armsCm")} value={armCm} onChangeText={setArmCm} keyboardType="decimal-pad" placeholder="34" />
                  <FormField label={t("tracking.forearmsCm")} value={forearmCm} onChangeText={setForearmCm} keyboardType="decimal-pad" placeholder="28" />
                  <FormField label={t("tracking.thighsCm")} value={thighCm} onChangeText={setThighCm} keyboardType="decimal-pad" placeholder="56" />
                  <FormField label={t("tracking.calvesCm")} value={calfCm} onChangeText={setCalfCm} keyboardType="decimal-pad" placeholder="37" />
                  <FormField label={t("tracking.neckCm")} value={neckCm} onChangeText={setNeckCm} keyboardType="decimal-pad" placeholder="39" />
                  <FormField label={t("tracking.visceralFatRating")} value={visceralFatRating} onChangeText={setVisceralFatRating} keyboardType="number-pad" placeholder="7" />
                  <FormField label={t("tracking.restingHeartRate")} value={restingHeartRate} onChangeText={setRestingHeartRate} keyboardType="number-pad" placeholder="62" />
                </View>
              ) : null}
              <FormField label={t("tracking.notes")} value={notes} onChangeText={setNotes} multiline placeholder={t("tracking.notesPlaceholder")} />
              {!canSaveBodyProgress ? (
                <Text style={[styles.helperText, { color: palette.text.secondary }]}>
                  {t("tracking.addMeasurementToSave")}
                </Text>
              ) : null}
            </>
          )}
        </ScrollView>
        <StickyActionBar bottomOffset={0}>
          {mode === "workout" ? (
            <ZookButton
              testID="tracking-entry-save"
              onPress={() => void saveWorkout()}
              busy={saving}
              busyLabel={t("settings.saving")}
              icon="save-outline"
              disabled={!canSaveWorkout}
              fullWidth
            >
              {t("tracking.saveWorkout")}
            </ZookButton>
          ) : (
            <ZookButton
              testID="tracking-body-save"
              onPress={() => void saveBodyProgress()}
              busy={saving}
              busyLabel={t("settings.saving")}
              icon="save-outline"
              disabled={!canSaveBodyProgress}
              fullWidth
            >
              {t("tracking.saveMeasurements")}
            </ZookButton>
          )}
        </StickyActionBar>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  exerciseGroup: {
    gap: spacing.sm,
  },
  sectionActionRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  exerciseHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  exerciseIndex: typography.caption,
  exerciseNumbers: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  exerciseNumberField: {
    flex: 1,
  },
  iconAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  iconActionPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.96 }],
  },
  moreMeasurementsButton: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  moreMeasurementsButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.985 }],
  },
  moreMeasurementsText: {
    ...typography.caption,
  },
  helperText: {
    ...typography.caption,
    marginTop: -spacing.xs,
  },
  advancedMeasurements: {
    gap: spacing.md,
  },
});
