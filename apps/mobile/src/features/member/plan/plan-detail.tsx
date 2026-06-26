import { useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@/components/expo-safe-bottom-sheet";
import { resolvePlanName } from "@zook/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InputAccessoryView, Keyboard, Platform, Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import {
  EmptyState,
  ExerciseRow,
  Card,
  IconBubble,
  AppHeader,
  ProgressBar,
  QueryErrorState,
  SectionHeader,
  SegmentedControl,
  StickyActionBar,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { ExerciseListSkeleton, PlansSkeleton } from "@/components/skeletons";
import {
  useCompletePlanAssignment,
  useMyPlans,
  usePlanExercises,
  type MyPlanRecord,
  type PlanExerciseRecord,
} from "@/lib/domains";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { plansApi } from "@/lib/domain-api";
import { useT } from "@/lib/i18n";
import { deleteStoredValue, getStoredValue, setStoredValue } from "@/lib/storage";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type PlanFilter = "workout" | "diet";
type PlanExercise = { name: string; sets: string; equipment: string; reps: string };

const feedbackAccessoryId = "plan-feedback-accessory";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function planTitle(assignment: MyPlanRecord | null | undefined, fallback: string) {
  return resolvePlanName(assignment?.plan) || fallback;
}

function planKind(assignment?: MyPlanRecord | null) {
  return (assignment?.plan?.type ?? "WORKOUT").toLowerCase();
}

function exerciseFromApi(exercise: PlanExerciseRecord, fallbacks: { sets: string; assigned: string; coachGuided: string }): PlanExercise {
  return {
    name: exercise.name,
    sets: exercise.sets ?? fallbacks.sets,
    equipment: exercise.equipment ?? exercise.day ?? fallbacks.assigned,
    reps: exercise.reps ?? exercise.raw ?? fallbacks.coachGuided,
  };
}

export default function Plans() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mode, palette } = useTheme();
  const t = useT();
  const [filter, setFilter] = useState<PlanFilter>("workout");
  const [refreshing, setRefreshing] = useState(false);
  const plansQuery = useMyPlans();
  const filters = useMemo(
    () => [
      { label: t("member.planDetail.workoutFilter"), value: "workout" as const },
      { label: t("member.planDetail.dietFilter"), value: "diet" as const },
    ],
    [t],
  );
  const plans = plansQuery.data?.plans ?? [];
  const filteredPlans = plans.filter((assignment) => {
    return planKind(assignment).includes(filter);
  });
  const selectedAssignment = filteredPlans[0] ?? plans[0] ?? null;
  const coachName = selectedAssignment?.assignedById ? t("member.planDetail.assignedByCoach") : t("member.planDetail.yourCoach");

  function openAssignment(assignmentId: string) {
    router.push(`/plan/${assignmentId}` as never);
  }

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["me", "plans"] });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <ZookScreen testID="plans-screen">
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
            stickyHeaderIndices: [0],
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
          <AppHeader
            title={t("member.planDetail.yourPlan")}
            showProfileShortcut={false}
            leading={
              <Pressable
                onPress={() => (router.canGoBack() ? router.back() : router.replace("/plan"))}
                accessibilityRole="button"
                accessibilityLabel={t("common.back")}
                hitSlop={12}
                style={({ pressed }) => [
                  styles.headerBackButton,
                  {
                    backgroundColor: mode === "dark" ? palette.surface.raised : palette.bg.elevated,
                    borderColor: palette.border.default,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
              >
                <Ionicons name="chevron-back" size={21} color={palette.text.primary} />
              </Pressable>
            }
          />

          {selectedAssignment ? (
            <Card variant="selected" contentStyle={styles.activePlanContent}>
              <View style={styles.activePlanTop}>
                <View style={styles.activePlanCopy}>
                  <Text style={[styles.eyebrow, { color: palette.text.secondary }]}>{t("member.planDetail.active")}</Text>
                  <Text style={[styles.activePlanTitle, { color: palette.text.primary }]}>
                    {planTitle(selectedAssignment, t("member.plan.assignedPlan"))}
                  </Text>
                  <Text style={[styles.activePlanMeta, { color: palette.text.secondary }]}>
                    {coachName} · {planKind(selectedAssignment)}
                  </Text>
                </View>
                <View style={styles.activePlanPercent}>
                  <Text style={[styles.activePlanPercentValue, { color: palette.accent.base }]}>
                    {selectedAssignment.progress?.completionPct ?? 0}
                  </Text>
                  <Text style={[styles.activePlanPercentSuffix, { color: palette.text.secondary }]}>%</Text>
                </View>
              </View>
              <ProgressBar
                value={(selectedAssignment.progress?.completionPct ?? 0) / 100}
                label={t("member.plan.progress")}
              />
              <View style={styles.activePlanActions}>
                <ZookButton
                  testID="plans-start-session"
                  onPress={() => openAssignment(selectedAssignment.id)}
                  icon="open-outline"
                  style={styles.activePlanPrimaryAction}
                >
                  {t("member.plan.openTodayPlan")}
                </ZookButton>
                <ZookButton
                  testID="plans-view-active"
                  onPress={() => setFilter(planKind(selectedAssignment).includes("diet") ? "diet" : "workout")}
                  variant="secondary"
                  style={styles.activePlanSecondaryAction}
                >
                  {t("member.planDetail.seeWeeklyList")}
                </ZookButton>
              </View>
            </Card>
          ) : null}

          <SegmentedControl options={filters} value={filter} onChange={setFilter} />

          <SectionHeader title={t("member.planDetail.upNextThisWeek")} />
          <View style={styles.libraryGrid}>
            {plansQuery.isLoading ? (
              <View style={styles.fullWidth}>
                <PlansSkeleton />
              </View>
            ) : null}
            {plansQuery.isError ? (
              <View style={styles.fullWidth}>
                <Card variant="compact">
                  <QueryErrorState
                    error={plansQuery.error}
                    onRetry={() => void plansQuery.refetch()}
                  />
                </Card>
              </View>
            ) : null}
            {!plansQuery.isLoading && !plansQuery.isError && !filteredPlans.length ? (
              <Card variant="compact" style={styles.emptyPlanCard}>
                <EmptyState icon="clipboard-outline" title={t("member.plan.noPlanAssigned")} body={t("member.planDetail.noPlanAssignedBody")} />
              </Card>
            ) : null}
            {filteredPlans.map((assignment, index) => (
              <Pressable
                testID={index === 0 ? "plan-row-first" : `plan-row-${assignment.id}`}
                key={assignment.id}
                onPress={() => openAssignment(assignment.id)}
                accessibilityRole="button"
                style={[
                  styles.libraryCard,
                  {
                    backgroundColor: mode === "dark" ? palette.surface.raised : palette.bg.elevated,
                    borderColor: palette.border.default,
                  },
                ]}
              >
                <IconBubble
                  icon={
                    planKind(assignment).includes("diet") ? "nutrition-outline" : "barbell-outline"
                  }
                  tone="neutral"
                  size={42}
                />
                <Text style={[styles.libraryTitle, { color: palette.text.primary }]}>
                  {planTitle(assignment, t("member.plan.assignedPlan"))}
                </Text>
                <Text style={[styles.libraryDetail, { color: palette.text.secondary }]}>
                  {t("member.plan.percentComplete", { percent: assignment.progress?.completionPct ?? 0 })}
                </Text>
              </Pressable>
            ))}
          </View>
        </KeyboardAwareScreen>
      </ZookScreen>
    </>
  );
}

export function PlanDetailScreen() {
  const params = useLocalSearchParams<{
    view?: string | string[];
    assignmentId?: string | string[];
    planId?: string | string[];
    focus?: string | string[];
  }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mode, palette } = useTheme();
  const t = useT();
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(new Set<string>());
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
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
  const requestedAssignmentId = firstParam(params.assignmentId);
  const progressStorageKey = selectedAssignment?.id
    ? `zook_plan_progress_${selectedAssignment.id}`
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
    setExercises(
      apiExercises.map((exercise) =>
        exerciseFromApi(exercise, {
          sets: t("member.planDetail.defaultSets"),
          assigned: t("member.planDetail.assigned"),
          coachGuided: t("member.plan.coachGuided"),
        }),
      ),
    );
    const apiCompleted = apiExercises
      .filter((exercise) => exercise.completed)
      .map((exercise) => exercise.name);
    if (!selectedAssignment?.id) {
      setCompleted(new Set(apiCompleted));
      return;
    }
    let cancelled = false;
    void getStoredValue(`zook_plan_progress_${selectedAssignment.id}`)
      .then((stored) => {
        if (cancelled) return;
        const persisted = stored ? (JSON.parse(stored) as string[]) : [];
        setCompleted(new Set([...apiCompleted, ...persisted.filter((name) => typeof name === "string")]));
      })
      .catch(() => setCompleted(new Set(apiCompleted)));
    return () => {
      cancelled = true;
    };
  }, [exercisesQuery.data?.exercises, selectedAssignment?.id, t]);

  useEffect(() => {
    setFeedbackStatus("");
    setFeedbackNote("");
    setFeedbackOpen(false);
    feedbackSheetRef.current?.dismiss();
  }, [selectedAssignment?.id]);

  const renderFeedbackBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  function openFeedbackSheet() {
    setFeedbackOpen(true);
    feedbackSheetRef.current?.present();
  }

  function closeFeedbackSheet() {
    Keyboard.dismiss();
    setFeedbackOpen(false);
    feedbackSheetRef.current?.dismiss();
  }

  function toggleExercise(name: string) {
    setCompleted((current) => {
      const next = new Set(current);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
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
      const message = t("member.planDetail.workoutMarkedComplete");
      setFeedbackStatus(message);
      showToast({ tone: "success", haptic: "success", message });
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
            contentContainerStyle: styles.content,
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
            <AppHeader
              title={planTitle(selectedAssignment, t("member.plan.assignedPlan"))}
              subtitle={coachName}
              style={[styles.stickyHeader, { backgroundColor: palette.bg.app }]}
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
                  style={[
                    styles.iconButton,
                    {
                      backgroundColor: feedbackOpen
                        ? palette.accent.base
                        : mode === "dark"
                          ? palette.surface.raised
                          : palette.bg.elevated,
                      borderColor: feedbackOpen ? palette.accent.strong : palette.border.default,
                    },
                  ]}
                >
                  <Ionicons
                    name="information-outline"
                    size={22}
                    color={feedbackOpen ? palette.text.onAccent : palette.text.primary}
                  />
                </Pressable>
              }
              showProfileShortcut={false}
            />

            {feedbackStatus ? (
              <Text style={[styles.inlineStatus, { color: palette.accent.base }]}>
                {feedbackStatus}
              </Text>
            ) : null}

            <Card variant="selected" contentStyle={styles.progressContent}>
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
              <ProgressBar value={progress} label={t("member.diet.today")} />
            </Card>

            <SectionHeader title={t("member.planDetail.exercises")} />
            <View style={styles.stack}>
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
              {exercises.map((exercise) => (
                <ExerciseRow
                  key={exercise.name}
                  title={exercise.name}
                  sets={exercise.sets}
                  detail={`${exercise.equipment} · ${exercise.reps}`}
                  complete={completed.has(exercise.name)}
                  onPress={() => toggleExercise(exercise.name)}
                />
              ))}
            </View>
          </KeyboardAwareScreen>
          <StickyActionBar>
            <View style={styles.stickyActionRow}>
              <ZookButton
                testID="plan-detail-send-feedback"
                onPress={openFeedbackSheet}
                variant="secondary"
                icon="send-outline"
                style={styles.stickyActionHalf}
              >
                {t("member.planDetail.feedback")}
              </ZookButton>
              <ZookButton
                testID="plan-detail-complete-workout"
                onPress={() => void completeWorkout()}
                disabled={!selectedAssignment || completePlan.isPending}
                icon="checkmark-circle-outline"
                style={styles.stickyActionPrimary}
              >
                {completePlan.isPending ? t("member.planDetail.completing") : t("member.planDetail.completeWorkout")}
              </ZookButton>
            </View>
          </StickyActionBar>
        </ZookScreen>
        <BottomSheetModal
          ref={feedbackSheetRef}
          snapPoints={feedbackSnapPoints}
          enablePanDownToClose
          backdropComponent={renderFeedbackBackdrop}
          backgroundStyle={{
            ...styles.sheetBackground,
            backgroundColor: palette.bg.elevated,
            borderColor: palette.border.default,
          }}
          handleIndicatorStyle={{ ...styles.sheetHandle, backgroundColor: palette.border.strong }}
          onDismiss={() => setFeedbackOpen(false)}
        >
          <BottomSheetView style={styles.feedbackSheetContent}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleCopy}>
                <Text style={[styles.cardTitle, { color: palette.text.primary }]}>{t("member.planDetail.tellCoach")}</Text>
                <Text style={[styles.cardBody, { color: palette.text.secondary }]}>
                  {t("member.planDetail.feedbackSheetBody")}
                </Text>
              </View>
              <Pressable
                onPress={closeFeedbackSheet}
                accessibilityRole="button"
                accessibilityLabel={t("member.planDetail.closeFeedback")}
                style={[styles.sheetCloseButton, { borderColor: palette.border.default }]}
              >
                <Ionicons name="close" size={18} color={palette.text.primary} />
              </Pressable>
            </View>
            <View style={styles.feedbackOptions}>
              {[
                t("member.planDetail.tooHard"),
                t("member.planDetail.needSwap"),
                t("member.planDetail.pain"),
                t("member.planDetail.done"),
              ].map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setFeedbackNote(option)}
                  accessibilityRole="button"
                  style={({ pressed }) => [
                    styles.feedbackOption,
                    {
                      backgroundColor:
                        feedbackNote === option ? palette.surface.accentSoft : palette.surface.raised,
                      borderColor:
                        feedbackNote === option ? palette.accent.strong : palette.border.default,
                    },
                    pressed ? styles.feedbackOptionPressed : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackOptionText,
                      {
                        color:
                          feedbackNote === option ? palette.accent.strong : palette.text.secondary,
                      },
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
            <ZookButton
              testID="plan-detail-feedback-send"
              onPress={() => void sendFeedback()}
              icon="send-outline"
              style={styles.feedbackSendButton}
            >
              {t("member.planDetail.send")}
            </ZookButton>
            <TextInput
              testID="plan-detail-feedback-input"
              inputAccessoryViewID={Platform.OS === "ios" ? feedbackAccessoryId : undefined}
              value={feedbackNote}
              onChangeText={setFeedbackNote}
              onSubmitEditing={() => void sendFeedback()}
              returnKeyType="send"
              maxLength={280}
              placeholder={t("member.planDetail.addShortNote")}
              placeholderTextColor={palette.text.tertiary}
              style={[
                styles.feedbackInput,
                {
                  backgroundColor: mode === "dark" ? palette.bg.overlay : palette.bg.app,
                  borderColor: palette.border.default,
                  color: palette.text.primary,
                },
              ]}
            />
            {Platform.OS === "ios" ? (
              <InputAccessoryView nativeID={feedbackAccessoryId}>
                <View
                  style={[
                    styles.feedbackAccessory,
                    { backgroundColor: palette.bg.elevated, borderTopColor: palette.border.default },
                  ]}
                >
                  <ZookButton
                    testID="plan-detail-feedback-send"
                    onPress={() => void sendFeedback()}
                    icon="send-outline"
                    style={styles.feedbackAccessoryButton}
                  >
                    {t("member.planDetail.send")}
                  </ZookButton>
                </View>
              </InputAccessoryView>
            ) : null}
            {feedbackStatus ? (
              <Text style={[styles.inlineStatus, { color: palette.accent.base }]}>
                {feedbackStatus}
              </Text>
            ) : null}
          </BottomSheetView>
        </BottomSheetModal>
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
    gap: spacing.lg,
    paddingBottom: layout.bottomNavContentPadding + layout.stickyActionHeight,
  },
  stickyHeader: {
    marginHorizontal: -layout.screenPadding,
    paddingHorizontal: layout.screenPadding,
    paddingBottom: spacing.sm,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetBackground: {
    borderWidth: 1,
  },
  sheetHandle: {},
  feedbackSheetContent: {
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  sheetTitleCopy: {
    flex: 1,
    gap: 4,
  },
  sheetCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  feedbackOption: {
    minHeight: 40,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackOptionPressed: {
    opacity: 0.84,
  },
  feedbackOptionText: {
    ...typography.caption,
  },
  feedbackInput: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    ...typography.body,
  },
  feedbackSendButton: {
    alignSelf: "flex-start",
    minWidth: 116,
  },
  feedbackAccessory: {
    borderTopWidth: 1,
    padding: spacing.sm,
  },
  feedbackAccessoryButton: {
    alignSelf: "stretch",
  },
  inlineStatus: {
    ...typography.caption,
    paddingHorizontal: 4,
  },
  stack: {
    gap: spacing.sm,
  },
  activePlanContent: {
    gap: spacing.lg,
    padding: 16,
  },
  activePlanTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  activePlanCopy: {
    flex: 1,
    gap: 4,
  },
  activePlanTitle: {
    ...typography.headerTitle,
  },
  activePlanMeta: {
    ...typography.small,
  },
  activePlanPercent: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  activePlanPercentValue: {
    fontSize: 26,
    lineHeight: 30,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  activePlanPercentSuffix: {
    ...typography.bodyStrong,
  },
  activePlanActions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  activePlanPrimaryAction: {
    flex: 1,
  },
  activePlanSecondaryAction: {
    minWidth: 76,
  },
  progressContent: {
    gap: spacing.lg,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.md,
  },
  progressCopy: {
    flex: 1,
    gap: 4,
  },
  cardTitle: {
    ...typography.cardTitle,
  },
  cardBody: {
    ...typography.body,
  },
  progressText: {
    ...typography.metric,
  },
  eyebrow: {
    ...typography.eyebrow,
  },
  libraryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  fullWidth: {
    width: "100%",
  },
  libraryCard: {
    width: "48.5%",
    minHeight: 112,
    borderRadius: 20,
    borderWidth: 1,
    padding: 12,
    gap: spacing.sm,
    justifyContent: "center",
  },
  libraryTitle: {
    ...typography.cardTitle,
  },
  libraryDetail: {
    ...typography.small,
  },
  emptyPlanCard: {
    width: "100%",
  },
  stickyActionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  stickyActionHalf: {
    flex: 1,
  },
  stickyActionPrimary: {
    flex: 1.6,
  },
});
