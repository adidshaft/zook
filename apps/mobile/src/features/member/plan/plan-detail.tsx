import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import type * as NotificationsModule from "expo-notifications";
import { BottomSheetModal } from "@/components/expo-safe-bottom-sheet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard, Platform, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  EmptyState,
  Card,
  ScreenHeader,
  ProgressBar,
  QueryErrorState,
  SectionHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { useHideBottomNav } from "@/components/primitives/bottom-nav-context";
import { ExerciseListSkeleton } from "@/components/skeletons";
import {
  useCompletePlanAssignment,
  useMyPlans,
  usePlanExercises,
  type PlanExerciseRecord,
} from "@/lib/domains";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { plansApi } from "@/lib/domain-api";
import { useT } from "@/lib/i18n";
import { deleteStoredValue, getStoredValue, setStoredValue } from "@/lib/storage";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";
import { maybeRequestReview } from "@/lib/review-prompt";
import { trackEvent } from "@/lib/analytics";
import {
  completedNamesFromApi,
  legacyPlanProgressStorageKey,
  mergePlanExercises,
  parseStoredCustomExercises,
  parseStoredStringArray,
  planCustomExerciseStorageKey,
  planProgressStorageKey,
  stalePlanStorageKeys,
  serializeCustomExercises,
  type PlanExerciseDraft,
} from "./plan-detail-storage";
import { CustomExerciseSheet } from "./custom-exercise-sheet";
import { FeedbackSheet } from "./feedback-sheet";
import { PlanListScreen } from "./plan-list-screen";
import { planTitle } from "./plan-summary-helpers";
import { RestTimerBar, SetLoggerSheet, type RestTimerState } from "./set-logger-sheet";

type PlanExercise = PlanExerciseDraft;

const feedbackAccessoryId = "plan-feedback-accessory";
const defaultRestSeconds = 90;
const addRestSeconds = 15;

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function exerciseFromApi(exercise: PlanExerciseRecord, fallbacks: { sets: string; assigned: string; coachGuided: string }): PlanExercise {
  return {
    name: exercise.name,
    sets: exercise.sets ?? fallbacks.sets,
    equipment: exercise.equipment ?? exercise.day ?? fallbacks.assigned,
    reps: exercise.reps ?? exercise.raw ?? fallbacks.coachGuided,
    restSeconds: exercise.restSeconds ?? null,
  };
}

function getRestSeconds(exercise: PlanExercise) {
  return typeof exercise.restSeconds === "number" && exercise.restSeconds > 0
    ? exercise.restSeconds
    : defaultRestSeconds;
}

function loadNativeNotifications() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports -- Expo Go crashes if this native module is imported eagerly.
    return require("expo-notifications") as typeof NotificationsModule;
  } catch {
    return null;
  }
}

export default PlanListScreen;

export function PlanDetailScreen() {
  useHideBottomNav();
  const params = useLocalSearchParams<{
    view?: string | string[];
    assignmentId?: string | string[];
    planId?: string | string[];
    focus?: string | string[];
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mode, palette } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(new Set<string>());
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const [restTimer, setRestTimer] = useState<RestTimerState | null>(null);
  const [customExerciseName, setCustomExerciseName] = useState("");
  const [addingExercise, setAddingExercise] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const feedbackSheetRef = useRef<BottomSheetModal>(null);
  const feedbackSnapPoints = useMemo(() => ["42%"], []);
  const { activeOrgId, token } = useAuth();
  const plansQuery = useMyPlans();
  const completePlan = useCompletePlanAssignment();
  const plans = useMemo(() => plansQuery.data?.plans ?? [], [plansQuery.data?.plans]);
  const selectedAssignment =
    plans.find((assignment) => assignment.id === selectedAssignmentId) ??
    plans[0] ??
    null;
  const exercisesQuery = usePlanExercises(selectedAssignment?.id);
  const coachName = selectedAssignment?.assignedById ? t("member.planDetail.assignedByCoach") : t("member.planDetail.yourCoach");
  const completedCount = exercises.filter((exercise) => completed.has(exercise.name)).length;
  const progress = completedCount / Math.max(exercises.length, 1);
  const canCompleteWorkout = Boolean(selectedAssignment) && completedCount > 0;
  const requestedAssignmentId = firstParam(params.assignmentId);
  const progressStorageKey = selectedAssignment?.id
    ? planProgressStorageKey(selectedAssignment.id)
    : null;
  const customExerciseStorageKey = selectedAssignment?.id
    ? planCustomExerciseStorageKey(selectedAssignment.id)
    : null;

  useEffect(() => {
    if (!requestedAssignmentId) {
      return;
    }
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: ["me", "plans"] }),
      queryClient.invalidateQueries({ queryKey: ["me", "plans", requestedAssignmentId] }),
      queryClient.invalidateQueries({
        queryKey: ["me", "plans", requestedAssignmentId, "exercises"],
      }),
      queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
    ]);
  }, [queryClient, requestedAssignmentId]);

  useEffect(() => {
    if (requestedAssignmentId) {
      setSelectedAssignmentId(requestedAssignmentId);
      return;
    }

    const requestedPlanId = firstParam(params.planId);
    if (requestedPlanId && plans.length) {
      const matchedPlan = plans.find(
        (assignment) =>
          assignment.id === requestedPlanId || assignment.plan?.id === requestedPlanId,
      );
      if (matchedPlan) {
        setSelectedAssignmentId(matchedPlan.id);
      }
    }
  }, [params.planId, plans, requestedAssignmentId]);

  useEffect(() => {
    if (!selectedAssignmentId && plans[0]) {
      setSelectedAssignmentId(plans[0].id);
    }
  }, [plans, selectedAssignmentId]);

  useEffect(() => {
    const apiExercises = exercisesQuery.data?.exercises ?? [];
    const mappedApiExercises = apiExercises.map((exercise) =>
      exerciseFromApi(exercise, {
        sets: t("member.planDetail.defaultSets"),
        assigned: t("member.planDetail.assigned"),
        coachGuided: t("member.plan.coachGuided"),
      }),
    );
    const apiCompleted = completedNamesFromApi(apiExercises);
    if (!selectedAssignment?.id) {
      setExercises(mappedApiExercises);
      setCompleted(new Set(apiCompleted));
      return;
    }
    const storedProgressKey = planProgressStorageKey(selectedAssignment.id);
    const storedCustomExerciseKey = planCustomExerciseStorageKey(selectedAssignment.id);
    let cancelled = false;
    void Promise.all([
      getStoredValue(storedProgressKey),
      getStoredValue(storedCustomExerciseKey),
      ...stalePlanStorageKeys(selectedAssignment.id).map((key) => deleteStoredValue(key)),
    ])
      .then(([storedProgress, storedCustom]) => {
        if (cancelled) return;
        const persisted = parseStoredStringArray(storedProgress);
        const customExercises = parseStoredCustomExercises(storedCustom);
        setExercises(mergePlanExercises(mappedApiExercises, customExercises));
        setCompleted(new Set([...apiCompleted, ...persisted]));
      })
      .catch(() => {
        setExercises(mappedApiExercises);
        setCompleted(new Set(apiCompleted));
      });
    return () => {
      cancelled = true;
    };
  }, [customExerciseStorageKey, exercisesQuery.data?.exercises, progressStorageKey, selectedAssignment?.id, t]);

  useEffect(() => {
    setFeedbackStatus("");
    setFeedbackNote("");
    setFeedbackOpen(false);
    setRestTimer(null);
    feedbackSheetRef.current?.dismiss();
  }, [selectedAssignment?.id]);

  const fireRestCompleteNotification = useCallback(
    (exerciseName: string) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const notifications = loadNativeNotifications();
      if (!notifications) {
        return;
      }
      void notifications.scheduleNotificationAsync({
        content: {
          title: t("plan.rest.title"),
          body: exerciseName,
          sound: "default",
        },
        trigger: Platform.OS === "android"
          ? {
              seconds: 1,
              channelId: "reminders",
            }
          : null,
      }).catch(() => {});
    },
    [t],
  );

  useEffect(() => {
    if (!restTimer) {
      return undefined;
    }
    const interval = setInterval(() => {
      setRestTimer((current) => {
        if (!current) {
          return null;
        }
        const remainingSeconds = Math.max(0, Math.ceil((current.endsAt - Date.now()) / 1000));
        if (remainingSeconds <= 0) {
          fireRestCompleteNotification(current.exerciseName);
          return null;
        }
        return { ...current, remainingSeconds };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [fireRestCompleteNotification, restTimer]);

  function openFeedbackSheet() {
    setFeedbackOpen(true);
    feedbackSheetRef.current?.present();
  }

  function closeFeedbackSheet() {
    Keyboard.dismiss();
    setFeedbackOpen(false);
    feedbackSheetRef.current?.dismiss();
  }

  function startRestTimer(exercise: PlanExercise) {
    const durationSeconds = getRestSeconds(exercise);
    setRestTimer({
      exerciseName: exercise.name,
      durationSeconds,
      remainingSeconds: durationSeconds,
      endsAt: Date.now() + durationSeconds * 1000,
    });
  }

  function addRestTime() {
    setRestTimer((current) => current
      ? {
          ...current,
          durationSeconds: current.durationSeconds + addRestSeconds,
          remainingSeconds: current.remainingSeconds + addRestSeconds,
          endsAt: current.endsAt + addRestSeconds * 1000,
        }
      : current);
  }

  function toggleExercise(exercise: PlanExercise) {
    const willComplete = !completed.has(exercise.name);
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(exercise.name)) {
        next.delete(exercise.name);
      } else {
        next.add(exercise.name);
      }
      if (progressStorageKey) {
        void setStoredValue(progressStorageKey, JSON.stringify(Array.from(next))).catch(() => {
          showToast({
            title: t("member.planDetail.progressNotSaved"),
            message: t("member.planDetail.progressNotSavedBody"),
            tone: "amber",
            haptic: "warning",
          });
        });
      }
      return next;
    });
    if (willComplete) {
      startRestTimer(exercise);
    }
  }

  function addCustomExercise() {
    const name = customExerciseName.trim();
    if (!name) {
      return;
    }
    setExercises((current) => {
      const existingNames = new Set(current.map((exercise) => exercise.name.toLowerCase()));
      if (existingNames.has(name.toLowerCase())) {
        return current;
      }
      const next = [
        ...current,
        {
          name,
          sets: t("member.planDetail.customSets"),
          equipment: t("member.planDetail.addedByYou"),
          reps: t("member.planDetail.customExercise"),
        },
      ];
      if (customExerciseStorageKey) {
        const apiExerciseNames = new Set(
          (exercisesQuery.data?.exercises ?? []).map((exercise) => exercise.name.toLowerCase()),
        );
        const customExercises = next.filter(
          (exercise) => !apiExerciseNames.has(exercise.name.toLowerCase()),
        );
        void setStoredValue(customExerciseStorageKey, serializeCustomExercises(customExercises)).catch(() => {
          showToast({
            title: t("member.planDetail.progressNotSaved"),
            message: t("member.planDetail.progressNotSavedBody"),
            tone: "amber",
            haptic: "warning",
          });
        });
      }
      return next;
    });
    setCustomExerciseName("");
    setAddingExercise(false);
  }

  async function sendFeedback() {
    const cleanNote = feedbackNote.trim();
    if (!cleanNote) {
      setFeedbackStatus(t("member.planDetail.pickNoteFirst"));
      return;
    }
    if (!selectedAssignment || !token || !activeOrgId) {
      setFeedbackStatus(t("member.planDetail.signInAgainFeedback"));
      return;
    }
    Keyboard.dismiss();
    closeFeedbackSheet();
    setFeedbackStatus(t("member.planDetail.sending"));
    try {
      await plansApi.sendFeedback({
        token,
        orgId: activeOrgId,
        assignmentId: selectedAssignment.id,
        message: cleanNote,
      });
      setFeedbackStatus(t("member.planDetail.sentToCoach"));
      showToast({ tone: "success", haptic: "success", message: t("member.planDetail.feedbackSent") });
      setFeedbackNote("");
    } catch (error) {
      const message = getApiErrorMessage(error) || t("member.planDetail.failedToSend");
      setFeedbackStatus(message);
      showToast({ title: t("member.planDetail.actionFailed"), message, tone: "danger", haptic: "error" });
    }
  }

  async function completeWorkout() {
    if (!selectedAssignment) {
      return;
    }
    try {
      await completePlan.mutateAsync({
        assignmentId: selectedAssignment.id,
        exercises: exercises
          .filter((exercise) => completed.has(exercise.name))
          .map((exercise) => ({
          name: exercise.name,
          completed: true,
          notes: exercise.reps,
        })),
        feedback: feedbackNote.trim() || undefined,
      });
      if (progressStorageKey) {
        await deleteStoredValue(progressStorageKey);
      }
      if (customExerciseStorageKey) {
        await deleteStoredValue(customExerciseStorageKey);
      }
      if (selectedAssignment?.id) {
        await deleteStoredValue(legacyPlanProgressStorageKey(selectedAssignment.id));
      }
      const message = t("member.planDetail.workoutMarkedComplete");
      setFeedbackStatus(message);
      showToast({ tone: "success", haptic: "success", message });
      void maybeRequestReview("workout");
      void trackEvent("workout_completed", { completedCount });
    } catch (error) {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "plans"] }),
        selectedAssignment?.id
          ? queryClient.invalidateQueries({ queryKey: ["me", "plans", selectedAssignment.id] })
          : Promise.resolve(),
        selectedAssignment?.id
          ? queryClient.invalidateQueries({
              queryKey: ["me", "plans", selectedAssignment.id, "exercises"],
            })
          : Promise.resolve(),
        queryClient.invalidateQueries({ queryKey: ["me", "home"] }),
      ]);
      const message = getApiErrorMessage(error) || t("member.planDetail.workoutProgressNotSaved");
      setFeedbackStatus(message);
      showToast({ title: t("member.planDetail.actionFailed"), message, tone: "danger", haptic: "error" });
    }
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "plans"] }),
        selectedAssignment?.id
          ? queryClient.invalidateQueries({
              queryKey: ["me", "plans", selectedAssignment.id, "exercises"],
            })
          : Promise.resolve(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <ZookScreen testID="plan-detail-screen">
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: [
              styles.content,
              canCompleteWorkout || restTimer ? styles.contentWithWorkoutDock : styles.contentWithoutWorkoutDock,
              restTimer ? styles.contentWithRestDock : null,
            ],
            refreshControl: (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={palette.accent.base}
                colors={[palette.accent.base]}
              />
            ),
          }}
        >
            <ScreenHeader
              title={planTitle(selectedAssignment, t("member.plan.assignedPlan"))}
              subtitle={coachName}
              style={styles.detailHeader}
              leading={
                <Pressable
                  onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.back")}
                  style={[
                    styles.iconButton,
                    {
                      backgroundColor: mode === "dark" ? palette.surface.raised : palette.bg.elevated,
                      borderColor: palette.border.default,
                    },
                  ]}
                >
                  <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
                </Pressable>
              }
              trailing={
                <Pressable
                  testID="plan-detail-open-feedback"
                  onPress={openFeedbackSheet}
                  accessibilityRole="button"
                  accessibilityLabel={t("member.planDetail.tellCoach")}
                  style={({ pressed }) => [
                    styles.iconButton,
                    {
                      backgroundColor: feedbackOpen
                        ? palette.accent.base
                        : mode === "dark"
                          ? palette.surface.raised
                          : palette.bg.elevated,
                      borderColor: feedbackOpen ? palette.accent.strong : palette.border.default,
                    },
                    pressed ? styles.iconButtonPressed : null,
                  ]}
                >
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={20}
                    color={feedbackOpen ? palette.text.onAccent : palette.text.primary}
                  />
                </Pressable>
              }
              showProfileShortcut={false}
            />

            {feedbackStatus ? (
              <View style={[styles.inlineStatusPill, { backgroundColor: palette.surface.accentSoft }]}>
                <Ionicons name="checkmark-circle-outline" size={13} color={palette.accent.base} />
                <Text numberOfLines={1} style={[styles.inlineStatus, { color: palette.accent.base }]}>
                  {feedbackStatus}
                </Text>
              </View>
            ) : null}

            <Card variant="selected" padding={10} radius={18} contentStyle={styles.progressContent}>
              <View style={styles.progressHeader}>
                <View style={styles.progressCopy}>
                  <Text style={[styles.cardTitle, { color: palette.text.primary }]}>
                    {t("member.planDetail.workoutProgress")}
                  </Text>
                  <Text style={[styles.cardBody, { color: palette.text.secondary }]}>
                    {t("member.planDetail.completedCount", { completed: completedCount, total: exercises.length })}
                  </Text>
                </View>
                <Text style={[styles.progressText, { color: palette.accent.base }]}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
              <ProgressBar value={progress} />
            </Card>

            <SectionHeader
              title={t("member.planDetail.exercises")}
              action={
                <Pressable
                  testID="plan-detail-add-exercise"
                  onPress={() => setAddingExercise((current) => !current)}
                  accessibilityRole="button"
                  accessibilityLabel={t("member.planDetail.addExercise")}
                  style={({ pressed }) => [
                    styles.addExerciseButton,
                    {
                      backgroundColor: mode === "dark" ? palette.surface.raised : palette.bg.elevated,
                      borderColor: palette.border.default,
                    },
                    pressed ? styles.iconButtonPressed : null,
                  ]}
                >
                  <Ionicons name="add" size={18} color={palette.text.primary} />
                  <Text style={[styles.addExerciseButtonText, { color: palette.text.primary }]}>
                    {t("member.planDetail.addExercise")}
                  </Text>
                </Pressable>
              }
            />
            <View style={styles.stack}>
              {addingExercise ? (
                <CustomExerciseSheet
                  addLabel={t("member.planDetail.add")}
                  name={customExerciseName}
                  onAdd={addCustomExercise}
                  onChangeName={setCustomExerciseName}
                  placeholder={t("member.planDetail.exerciseNamePlaceholder")}
                />
              ) : null}
              {exercisesQuery.isLoading ? (
                <ExerciseListSkeleton />
              ) : null}
              {exercisesQuery.isError ? (
                <Card variant="compact">
                  <QueryErrorState
                    error={exercisesQuery.error}
                    onRetry={() => void exercisesQuery.refetch()}
                  />
                </Card>
              ) : null}
              {!exercisesQuery.isLoading && !exercisesQuery.isError && !exercises.length ? (
                <Card variant="compact">
                  <EmptyState
                    title={t("member.plan.noExercises")}
                  />
                </Card>
              ) : null}
              <SetLoggerSheet
                add15Label={t("plan.rest.add15")}
                completed={completed}
                exercises={exercises}
                restTimer={restTimer}
                showRestBar={false}
                skipLabel={t("plan.rest.skip")}
                title={t("plan.rest.title")}
                onAddRestSeconds={addRestTime}
                onSkipRest={() => setRestTimer(null)}
                onToggleExercise={toggleExercise}
              />
            </View>
          </KeyboardAwareScreen>
          {restTimer ? (
            <View
              style={[
                styles.restDock,
                {
                  bottom: canCompleteWorkout ? layout.stickyActionHeight + Math.max(insets.bottom, 8) : Math.max(insets.bottom, 8),
                  paddingHorizontal: layout.screenPadding,
                },
              ]}
            >
              <RestTimerBar
                add15Label={t("plan.rest.add15")}
                restTimer={restTimer}
                skipLabel={t("plan.rest.skip")}
                title={t("plan.rest.title")}
                onAddRestSeconds={addRestTime}
                onSkipRest={() => setRestTimer(null)}
              />
            </View>
          ) : null}
          {canCompleteWorkout ? (
            <View
              style={[
                styles.workoutDock,
                {
                  backgroundColor: mode === "dark" ? palette.bg.app : palette.bg.elevated,
                  borderTopColor: palette.border.subtle,
                  paddingBottom: Math.max(insets.bottom, 8),
                },
              ]}
            >
              <ZookButton
                testID="plan-detail-complete-workout"
                onPress={() => void completeWorkout()}
                disabled={completePlan.isPending}
                icon="checkmark-circle-outline"
                fullWidth
              >
                {completePlan.isPending
                  ? t("member.planDetail.completing")
                  : t("member.planDetail.completeWorkout")}
              </ZookButton>
            </View>
          ) : null}
        </ZookScreen>
        <FeedbackSheet
          accessoryId={feedbackAccessoryId}
          feedbackNote={feedbackNote}
          feedbackStatus={feedbackStatus}
          onChangeFeedbackNote={setFeedbackNote}
          onClose={closeFeedbackSheet}
          onDismiss={() => setFeedbackOpen(false)}
          onSend={() => void sendFeedback()}
          sheetRef={feedbackSheetRef}
          snapPoints={feedbackSnapPoints}
        />
      </>
    );
}

const styles = StyleSheet.create({
  headerBackButton: {
    alignItems: "center",
    borderRadius: 20,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: layout.screenContentTopPadding,
    gap: spacing.md,
  },
  contentWithoutWorkoutDock: {
    paddingBottom: spacing.xxl,
  },
  contentWithWorkoutDock: {
    paddingBottom: layout.stickyActionHeight + spacing.md,
  },
  contentWithRestDock: {
    paddingBottom: layout.stickyActionHeight * 3,
  },
  detailHeader: {
    paddingTop: 2,
    paddingBottom: 2,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  inlineStatus: {
    ...typography.caption,
    flexShrink: 1,
    minWidth: 0,
  },
  inlineStatusPill: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: 999,
    flexDirection: "row",
    gap: 5,
    minHeight: 26,
    maxWidth: "100%",
    paddingHorizontal: 9,
  },
  stack: {
    gap: spacing.sm,
  },
  addExerciseButton: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  addExerciseButtonText: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
  workoutDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 60,
    alignSelf: "center",
    borderTopWidth: 1,
    maxWidth: layout.contentWidth,
    paddingHorizontal: layout.screenPadding,
    paddingTop: 10,
    width: "100%",
  },
  restDock: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 70,
    alignSelf: "center",
    maxWidth: layout.contentWidth,
    width: "100%",
  },
  progressContent: {
    gap: 6,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  progressCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  cardTitle: {
    ...typography.bodyStrong,
  },
  cardBody: {
    ...typography.caption,
  },
  progressText: {
    ...typography.headerTitle,
    fontVariant: ["tabular-nums"],
    lineHeight: 23,
  },
  eyebrow: {
    ...typography.eyebrow,
  },
});
