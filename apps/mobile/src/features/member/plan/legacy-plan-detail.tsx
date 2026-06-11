import { Stack, useLocalSearchParams, useRouter } from "expo-router";
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
  GlassCard,
  IconBubble,
  MobileHeader,
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
import { deleteStoredValue, getStoredValue, setStoredValue } from "@/lib/storage";
import { layout, spacing, typography, useTheme } from "@/lib/theme";
import { showToast } from "@/lib/toast";

type PlanFilter = "workout" | "diet";
type PlanExercise = { name: string; sets: string; equipment: string; reps: string };

const filters: Array<{ label: string; value: PlanFilter }> = [
  { label: "Workout", value: "workout" },
  { label: "Diet", value: "diet" },
];
const feedbackAccessoryId = "plan-feedback-accessory";

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function planTitle(assignment?: MyPlanRecord | null) {
  return resolvePlanName(assignment?.plan) || "Assigned plan";
}

function planKind(assignment?: MyPlanRecord | null) {
  return (assignment?.plan?.type ?? "WORKOUT").toLowerCase();
}

function exerciseFromApi(exercise: PlanExerciseRecord): PlanExercise {
  return {
    name: exercise.name,
    sets: exercise.sets ?? "3 sets",
    equipment: exercise.equipment ?? exercise.day ?? "Assigned",
    reps: exercise.reps ?? exercise.raw ?? "Coach guided",
  };
}

export default function Plans() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { mode, palette } = useTheme();
  const [filter, setFilter] = useState<PlanFilter>("workout");
  const [refreshing, setRefreshing] = useState(false);
  const plansQuery = useMyPlans();
  const plans = plansQuery.data?.plans ?? [];
  const filteredPlans = plans.filter((assignment) => {
    return planKind(assignment).includes(filter);
  });
  const selectedAssignment = filteredPlans[0] ?? plans[0] ?? null;
  const coachName = selectedAssignment?.assignedById ? "Assigned by coach" : "Your coach";

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
      <Stack.Screen options={{ headerShown: false }} />
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
          <MobileHeader
            title="Plans & training"
            subtitle="From your trainer · synced"
            showProfileShortcut={false}
          />

          {selectedAssignment ? (
            <GlassCard variant="selected" glow contentStyle={styles.activePlanContent}>
              <View style={styles.activePlanTop}>
                <View style={styles.activePlanCopy}>
                  <Text style={[styles.eyebrow, { color: palette.text.secondary }]}>ACTIVE</Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.activePlanTitle, { color: palette.text.primary }]}
                  >
                    {planTitle(selectedAssignment)}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.activePlanMeta, { color: palette.text.secondary }]}
                  >
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
                label="Progress"
              />
              <View style={styles.activePlanActions}>
                <ZookButton
                  testID="plans-start-session"
                  onPress={() => openAssignment(selectedAssignment.id)}
                  icon="play-outline"
                  style={styles.activePlanPrimaryAction}
                >
                  Start today's session
                </ZookButton>
                <ZookButton
                  testID="plans-view-active"
                  onPress={() => openAssignment(selectedAssignment.id)}
                  tone="secondary"
                  style={styles.activePlanSecondaryAction}
                >
                  View
                </ZookButton>
              </View>
            </GlassCard>
          ) : null}

          <SegmentedControl options={filters} value={filter} onChange={setFilter} />

          <SectionHeader title="Up next this week" />
          <View style={styles.libraryGrid}>
            {plansQuery.isLoading ? (
              <View style={styles.fullWidth}>
                <PlansSkeleton />
              </View>
            ) : null}
            {plansQuery.isError ? (
              <View style={styles.fullWidth}>
                <GlassCard variant="compact">
                  <QueryErrorState
                    error={plansQuery.error}
                    onRetry={() => void plansQuery.refetch()}
                  />
                </GlassCard>
              </View>
            ) : null}
            {!plansQuery.isLoading && !plansQuery.isError && !filteredPlans.length ? (
              <GlassCard variant="compact" style={styles.emptyPlanCard}>
                <EmptyState
                  icon="clipboard-outline"
                  title="No plan assigned"
                  body="Your trainer will create and assign a workout plan for you."
                />
              </GlassCard>
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
                  tone={planKind(assignment).includes("diet") ? "blue" : "lime"}
                  size={42}
                />
                <Text style={[styles.libraryTitle, { color: palette.text.primary }]}>
                  {planTitle(assignment)}
                </Text>
                <Text style={[styles.libraryDetail, { color: palette.text.secondary }]}>
                  {assignment.progress?.completionPct ?? 0}% complete
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
  const plans = plansQuery.data?.plans ?? [];
  const selectedAssignment =
    plans.find((assignment) => assignment.id === selectedAssignmentId) ??
    plans[0] ??
    null;
  const exercisesQuery = usePlanExercises(selectedAssignment?.id);
  const coachName = selectedAssignment?.assignedById ? "Assigned by coach" : "Your coach";
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
    setExercises(apiExercises.map(exerciseFromApi));
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
  }, [exercisesQuery.data?.exercises, selectedAssignment?.id]);

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
            title: "Progress not saved",
            message: "This device may not restore the checkbox state.",
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
      setFeedbackStatus("Pick one note first.");
      return;
    }
    if (!selectedAssignment || !token || !activeOrgId) {
      setFeedbackStatus("Sign in again to send feedback.");
      return;
    }
    Keyboard.dismiss();
    closeFeedbackSheet();
    setFeedbackStatus("Sending...");
    try {
      await plansApi.sendFeedback({
        token,
        orgId: activeOrgId,
        assignmentId: selectedAssignment.id,
        message: cleanNote,
      });
      setFeedbackStatus("Sent to coach.");
      showToast({ tone: "success", haptic: "success", message: "Feedback sent to coach." });
      setFeedbackNote("");
    } catch (error) {
      const message = getApiErrorMessage(error) || "Failed to send. Try again.";
      setFeedbackStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
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
      const message = "Workout marked complete.";
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
      const message = getApiErrorMessage(error) || "Workout progress could not be saved.";
      setFeedbackStatus(message);
      showToast({ title: "Action failed", message, tone: "danger", haptic: "error" });
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
      <Stack.Screen options={{ headerShown: false }} />
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
            <MobileHeader
              title={planTitle(selectedAssignment)}
              subtitle={coachName}
              style={[styles.stickyHeader, { backgroundColor: palette.bg.app }]}
              leading={
                <Pressable
                  onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
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
                  accessibilityLabel="Tell coach"
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

            <GlassCard variant="selected" contentStyle={styles.progressContent}>
              <View style={styles.progressHeader}>
                <View style={styles.progressCopy}>
                  <Text style={[styles.cardTitle, { color: palette.text.primary }]}>
                    Workout progress
                  </Text>
                  <Text style={[styles.cardBody, { color: palette.text.secondary }]}>
                    {completedCount} of {exercises.length} completed
                  </Text>
                </View>
                <Text style={[styles.progressText, { color: palette.accent.base }]}>
                  {Math.round(progress * 100)}%
                </Text>
              </View>
              <ProgressBar value={progress} label="Today" />
            </GlassCard>

            <SectionHeader title="Exercises" subtitle="Assigned by your coach" />
            <View style={styles.stack}>
              {exercisesQuery.isLoading ? (
                <ExerciseListSkeleton />
              ) : null}
              {exercisesQuery.isError ? (
                <GlassCard variant="compact">
                  <QueryErrorState
                    error={exercisesQuery.error}
                    onRetry={() => void exercisesQuery.refetch()}
                  />
                </GlassCard>
              ) : null}
              {!exercisesQuery.isLoading && !exercisesQuery.isError && !exercises.length ? (
                <GlassCard variant="compact">
                  <EmptyState
                    title="No exercises yet"
                    body="Assigned exercise details will appear here once your coach publishes them."
                  />
                </GlassCard>
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
                tone="secondary"
                icon="send-outline"
                style={styles.stickyActionHalf}
              >
                Send Feedback
              </ZookButton>
              <ZookButton
                testID="plan-detail-complete-workout"
                onPress={() => void completeWorkout()}
                disabled={!selectedAssignment || completePlan.isPending}
                icon="checkmark-circle-outline"
                style={styles.stickyActionHalf}
              >
                {completePlan.isPending ? "Completing..." : "Complete Workout"}
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
                <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Tell coach</Text>
                <Text style={[styles.cardBody, { color: palette.text.secondary }]}>
                  Send a quick note about this assignment.
                </Text>
              </View>
              <Pressable
                onPress={closeFeedbackSheet}
                accessibilityRole="button"
                accessibilityLabel="Close feedback"
                style={[styles.sheetCloseButton, { borderColor: palette.border.default }]}
              >
                <Ionicons name="close" size={18} color={palette.text.primary} />
              </Pressable>
            </View>
            <View style={styles.feedbackOptions}>
              {["Too hard", "Need swap", "Pain", "Done"].map((option) => (
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
              Send
            </ZookButton>
            <TextInput
              testID="plan-detail-feedback-input"
              inputAccessoryViewID={Platform.OS === "ios" ? feedbackAccessoryId : undefined}
              value={feedbackNote}
              onChangeText={setFeedbackNote}
              onSubmitEditing={() => void sendFeedback()}
              returnKeyType="send"
              maxLength={280}
              placeholder="Add a short note"
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
                    Send
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
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 14,
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
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  detailTitleBlock: {
    flex: 1,
    gap: 4,
  },
  detailTitle: {
    ...typography.headerTitle,
  },
  detailSubtitle: {
    ...typography.body,
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
    gap: 10,
  },
  stateContent: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  activePlanContent: {
    gap: 14,
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
    gap: 14,
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
  featuredContent: {
    gap: 14,
  },
  featuredTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  eyebrow: {
    ...typography.eyebrow,
  },
  planMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },
  metaDot: {
    ...typography.small,
  },
  libraryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
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
    gap: 8,
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
});
