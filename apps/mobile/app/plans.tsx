import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from "@gorhom/bottom-sheet";
import { resolvePlanName } from "@zook/ui";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, RefreshControl, StyleSheet, Text, TextInput, View } from "react-native";
import {
  BottomNav,
  EmptyState,
  ExerciseRow,
  GlassCard,
  IconBubble,
  MobileHeader,
  ProgressBar,
  SectionHeader,
  SegmentedControl,
  StickyActionBar,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { KeyboardAwareScreen } from "@/components/primitives/keyboard-aware-screen";
import { PlansSkeleton } from "@/components/skeletons";
import {
  useCompletePlanAssignment,
  useMyPlans,
  usePlanExercises,
  type MyPlanRecord,
  type PlanExerciseRecord,
} from "@/lib/query-hooks";
import { getApiErrorMessage, useAuth } from "@/lib/auth";
import { plansApi } from "@/lib/domain-api";
import { colors, layout, spacing, typography } from "@/lib/theme";

type PlanFilter = "workout" | "diet" | "habits";
type PlanExercise = { name: string; sets: string; equipment: string; reps: string };

const filters: Array<{ label: string; value: PlanFilter }> = [
  { label: "Workout", value: "workout" },
  { label: "Diet", value: "diet" },
  { label: "Habits", value: "habits" },
];

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
  const [filter, setFilter] = useState<PlanFilter>("workout");
  const [refreshing, setRefreshing] = useState(false);
  const plansQuery = useMyPlans();
  const plans = plansQuery.data?.plans ?? [];
  const filteredPlans = plans.filter((assignment) => {
    if (filter === "habits") return false;
    return planKind(assignment).includes(filter);
  });
  const selectedAssignment = filteredPlans[0] ?? plans[0] ?? null;
  const coachName = selectedAssignment?.assignedById ? "Assigned by coach" : "Your coach";

  function openAssignment(assignmentId: string) {
    router.push(`/plans/${assignmentId}` as never);
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
      <ZookScreen>
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
            refreshControl: (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.lime}
                colors={[colors.lime]}
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
                  <Text style={styles.eyebrow}>ACTIVE</Text>
                  <Text numberOfLines={1} style={styles.activePlanTitle}>
                    {planTitle(selectedAssignment)}
                  </Text>
                  <Text numberOfLines={1} style={styles.activePlanMeta}>
                    {coachName} · {planKind(selectedAssignment)}
                  </Text>
                </View>
                <View style={styles.activePlanPercent}>
                  <Text style={styles.activePlanPercentValue}>
                    {selectedAssignment.progress?.completionPct ?? 0}
                  </Text>
                  <Text style={styles.activePlanPercentSuffix}>%</Text>
                </View>
              </View>
              <ProgressBar
                value={(selectedAssignment.progress?.completionPct ?? 0) / 100}
                label="Progress"
              />
              <View style={styles.activePlanActions}>
                <ZookButton
                  onPress={() => openAssignment(selectedAssignment.id)}
                  icon="play-outline"
                  style={styles.activePlanPrimaryAction}
                >
                  Start today's session
                </ZookButton>
                <ZookButton
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

          <SectionHeader title={filter === "habits" ? "Habits" : "Up next this week"} />
          <View style={styles.libraryGrid}>
            {plansQuery.isLoading ? (
              <View style={styles.fullWidth}>
                <PlansSkeleton />
              </View>
            ) : null}
            {!plansQuery.isLoading && !filteredPlans.length ? (
              <GlassCard variant="compact" style={styles.emptyPlanCard}>
                <EmptyState
                  icon={filter === "habits" ? "flash-outline" : "clipboard-outline"}
                  title={filter === "habits" ? "No habits yet" : "No plan assigned"}
                  body={
                    filter === "habits"
                      ? "Your trainer can add sleep, water, or step goals here."
                      : "Your trainer will create and assign a workout plan for you."
                  }
                />
              </GlassCard>
            ) : null}
            {filteredPlans.map((assignment) => (
              <Pressable
                key={assignment.id}
                onPress={() => openAssignment(assignment.id)}
                accessibilityRole="button"
                style={styles.libraryCard}
              >
                <IconBubble
                  icon={
                    planKind(assignment).includes("diet") ? "nutrition-outline" : "barbell-outline"
                  }
                  tone={planKind(assignment).includes("diet") ? "blue" : "lime"}
                  size={42}
                />
                <Text style={styles.libraryTitle}>{planTitle(assignment)}</Text>
                <Text style={styles.libraryDetail}>
                  {assignment.progress?.completionPct ?? 0}% complete
                </Text>
              </Pressable>
            ))}
          </View>
        </KeyboardAwareScreen>
        <BottomNav selectedPath="/plans" />
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

  useEffect(() => {
    const requestedAssignmentId = firstParam(params.assignmentId);
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
  }, [params.assignmentId, params.planId, plans]);

  useEffect(() => {
    if (!selectedAssignmentId && plans[0]) {
      setSelectedAssignmentId(plans[0].id);
    }
  }, [plans, selectedAssignmentId]);

  useEffect(() => {
    const apiExercises = exercisesQuery.data?.exercises ?? [];
    setExercises(apiExercises.map(exerciseFromApi));
    setCompleted(
      new Set(
        apiExercises.filter((exercise) => exercise.completed).map((exercise) => exercise.name),
      ),
    );
  }, [exercisesQuery.data?.exercises]);

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
    setFeedbackStatus("Sending...");
    try {
      await plansApi.sendFeedback({
        token,
        orgId: activeOrgId,
        assignmentId: selectedAssignment.id,
        message: cleanNote,
      });
      setFeedbackStatus("Sent to coach.");
      closeFeedbackSheet();
      setFeedbackNote("");
    } catch (error) {
      setFeedbackStatus(getApiErrorMessage(error) || "Failed to send. Try again.");
    }
  }

  async function completeWorkout() {
    if (!selectedAssignment) {
      return;
    }
    await completePlan.mutateAsync({
      assignmentId: selectedAssignment.id,
      exercises: exercises.map((exercise) => ({
        name: exercise.name,
        completed: completed.has(exercise.name),
        notes: exercise.reps,
      })),
      feedback: feedbackNote.trim() || undefined,
    });
    setCompleted(new Set(exercises.map((exercise) => exercise.name)));
    setFeedbackStatus("Workout marked complete.");
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
      <ZookScreen>
        <KeyboardAwareScreen
          scrollViewProps={{
            contentInsetAdjustmentBehavior: "never",
            showsVerticalScrollIndicator: false,
            contentContainerStyle: styles.content,
            refreshControl: (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.lime}
                colors={[colors.lime]}
              />
            ),
          }}
        >
            <MobileHeader
              title={planTitle(selectedAssignment)}
              subtitle={coachName}
              leading={
                <Pressable
                  onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                  accessibilityRole="button"
                  accessibilityLabel="Back"
                  style={styles.iconButton}
                >
                  <Ionicons name="chevron-back" size={21} color={colors.text} />
                </Pressable>
              }
              trailing={
                <Pressable
                  onPress={openFeedbackSheet}
                  accessibilityRole="button"
                  accessibilityLabel="Tell coach"
                  style={[styles.iconButton, feedbackOpen ? styles.iconButtonActive : null]}
                >
                  <Ionicons
                    name="information-outline"
                    size={22}
                    color={feedbackOpen ? colors.bg : colors.text}
                  />
                </Pressable>
              }
              showProfileShortcut={false}
            />

            {feedbackStatus ? <Text style={styles.inlineStatus}>{feedbackStatus}</Text> : null}

            <GlassCard variant="selected" contentStyle={styles.progressContent}>
              <View style={styles.progressHeader}>
                <View style={styles.progressCopy}>
                  <Text style={styles.cardTitle}>Workout progress</Text>
                  <Text style={styles.cardBody}>
                    {completedCount} of {exercises.length} completed
                  </Text>
                </View>
                <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
              </View>
              <ProgressBar value={progress} label="Today" />
            </GlassCard>

            <SectionHeader title="Exercises" subtitle="Assigned by your coach" />
            <View style={styles.stack}>
              {exercisesQuery.isLoading ? (
                <PlansSkeleton />
              ) : null}
              {!exercisesQuery.isLoading && !exercises.length ? (
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
                onPress={openFeedbackSheet}
                tone="secondary"
                icon="send-outline"
                style={styles.stickyActionHalf}
              >
                Send Feedback
              </ZookButton>
              <ZookButton
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
          backgroundStyle={styles.sheetBackground}
          handleIndicatorStyle={styles.sheetHandle}
          onDismiss={() => setFeedbackOpen(false)}
        >
          <BottomSheetView style={styles.feedbackSheetContent}>
            <View style={styles.sheetHeader}>
              <View style={styles.sheetTitleCopy}>
                <Text style={styles.cardTitle}>Tell coach</Text>
                <Text style={styles.cardBody}>Send a quick note about this assignment.</Text>
              </View>
              <Pressable
                onPress={closeFeedbackSheet}
                accessibilityRole="button"
                accessibilityLabel="Close feedback"
                style={styles.sheetCloseButton}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>
            <View style={styles.feedbackOptions}>
              {["Too hard", "Need swap", "Pain", "Done"].map((option) => (
                <Pressable
                  key={option}
                  onPress={() => setFeedbackNote(option)}
                  accessibilityRole="button"
                  style={[
                    styles.feedbackOption,
                    feedbackNote === option ? styles.feedbackOptionActive : null,
                  ]}
                >
                  <Text
                    style={[
                      styles.feedbackOptionText,
                      feedbackNote === option ? styles.feedbackOptionTextActive : null,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </View>
            <TextInput
              value={feedbackNote}
              onChangeText={setFeedbackNote}
              placeholder="Add a short note"
              placeholderTextColor={colors.muted}
              style={styles.feedbackInput}
            />
            {feedbackStatus ? <Text style={styles.inlineStatus}>{feedbackStatus}</Text> : null}
            <ZookButton
              onPress={() => void sendFeedback()}
              icon="send-outline"
              style={styles.feedbackSendButton}
            >
              Send
            </ZookButton>
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
    paddingBottom: layout.bottomNavContentPadding,
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
  iconButtonActive: {
    borderColor: colors.lime,
    backgroundColor: colors.lime,
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
    color: colors.text,
    ...typography.headerTitle,
  },
  detailSubtitle: {
    color: colors.muted,
    ...typography.body,
  },
  sheetBackground: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
  },
  sheetHandle: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
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
    width: 36,
    height: 36,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  feedbackOption: {
    minHeight: 34,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackOptionActive: {
    borderColor: colors.lime,
    backgroundColor: "rgba(185,244,85,0.14)",
  },
  feedbackOptionText: {
    color: colors.muted,
    ...typography.caption,
  },
  feedbackOptionTextActive: {
    color: colors.lime,
  },
  feedbackInput: {
    minHeight: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(0,0,0,0.22)",
    color: colors.text,
    paddingHorizontal: 12,
    ...typography.body,
  },
  feedbackSendButton: {
    alignSelf: "flex-start",
    minWidth: 116,
  },
  inlineStatus: {
    color: colors.lime,
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
    color: colors.text,
    ...typography.headerTitle,
  },
  activePlanMeta: {
    color: colors.muted,
    ...typography.small,
  },
  activePlanPercent: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  activePlanPercentValue: {
    color: colors.lime,
    fontSize: 26,
    lineHeight: 30,
    fontFamily: "Inter_700Bold",
    fontVariant: ["tabular-nums"],
  },
  activePlanPercentSuffix: {
    color: colors.muted,
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
    color: colors.text,
    ...typography.cardTitle,
  },
  cardBody: {
    color: colors.muted,
    ...typography.body,
  },
  progressText: {
    color: colors.lime,
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
    color: colors.muted,
    ...typography.eyebrow,
  },
  planMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 7,
  },
  metaDot: {
    color: colors.subtle,
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
    borderColor: colors.border,
    backgroundColor: "rgba(255,255,255,0.045)",
    padding: 12,
    gap: 8,
    justifyContent: "center",
  },
  libraryTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  libraryDetail: {
    color: colors.muted,
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
