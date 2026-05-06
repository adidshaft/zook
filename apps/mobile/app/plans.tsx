import { Stack, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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
import {
  useCompletePlanAssignment,
  useMyPlans,
  usePlanExercises,
  type MyPlanRecord,
  type PlanExerciseRecord,
} from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

type PlanView = "assigned" | "detail";
type PlanFilter = "all" | "workout" | "diet";
type PlanExercise = { name: string; sets: string; equipment: string; reps: string };

const filters: Array<{ label: string; value: PlanFilter }> = [
  { label: "All", value: "all" },
  { label: "Workout", value: "workout" },
  { label: "Diet", value: "diet" },
];

function firstParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function planTitle(assignment?: MyPlanRecord | null) {
  return assignment?.plan?.title ?? "Assigned plan";
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
  const params = useLocalSearchParams<{
    view?: string | string[];
    assignmentId?: string | string[];
    planId?: string | string[];
    focus?: string | string[];
  }>();
  const [view, setView] = useState<PlanView>("assigned");
  const [filter, setFilter] = useState<PlanFilter>("all");
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [completed, setCompleted] = useState(new Set<string>());
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackNote, setFeedbackNote] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [exercises, setExercises] = useState<PlanExercise[]>([]);
  const plansQuery = useMyPlans();
  const completePlan = useCompletePlanAssignment();
  const plans = plansQuery.data?.plans ?? [];
  const filteredPlans = plans.filter((assignment) => {
    if (filter === "all") return true;
    return planKind(assignment).includes(filter);
  });
  const selectedAssignment =
    plans.find((assignment) => assignment.id === selectedAssignmentId) ??
    filteredPlans[0] ??
    plans[0] ??
    null;
  const exercisesQuery = usePlanExercises(selectedAssignment?.id);
  const coachName = selectedAssignment?.assignedById ? "Assigned by coach" : "Your coach";
  const completedCount = exercises.filter((exercise) => completed.has(exercise.name)).length;
  const progress = completedCount / Math.max(exercises.length, 1);

  useEffect(() => {
    if (firstParam(params.view) === "detail") {
      setView("detail");
    }
  }, [params.view]);

  useEffect(() => {
    const requestedAssignmentId = firstParam(params.assignmentId);
    if (requestedAssignmentId) {
      setSelectedAssignmentId(requestedAssignmentId);
      setView("detail");
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
        setView("detail");
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

  function sendFeedback() {
    const cleanNote = feedbackNote.trim();
    setFeedbackStatus(cleanNote ? "Sent to coach." : "Pick one note first.");
    if (cleanNote) {
      setFeedbackOpen(false);
      setFeedbackNote("");
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

  if (view === "detail") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ZookScreen>
          <ScrollView
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <View style={styles.detailHeader}>
              <Pressable
                onPress={() => setView("assigned")}
                accessibilityRole="button"
                accessibilityLabel="Back to plans"
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={21} color={colors.text} />
              </Pressable>
              <View style={styles.detailTitleBlock}>
                <Text numberOfLines={1} style={styles.detailTitle}>
                  {planTitle(selectedAssignment)}
                </Text>
                <Text numberOfLines={1} style={styles.detailSubtitle}>
                  {coachName}
                </Text>
              </View>
              <Pressable
                onPress={() => setFeedbackOpen((current) => !current)}
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
            </View>

            {feedbackOpen ? (
              <GlassCard variant="compact" contentStyle={styles.feedbackContent}>
                <Text style={styles.cardTitle}>Tell coach</Text>
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
                <ZookButton
                  onPress={sendFeedback}
                  icon="send-outline"
                  style={styles.feedbackSendButton}
                >
                  Send
                </ZookButton>
              </GlassCard>
            ) : null}

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
                <GlassCard variant="compact" contentStyle={styles.stateContent}>
                  <IconBubble icon="hourglass-outline" tone="amber" size={40} />
                  <Text style={styles.cardTitle}>Loading exercises...</Text>
                </GlassCard>
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
          </ScrollView>
          <StickyActionBar>
            <View style={styles.stickyActionRow}>
              <ZookButton
                onPress={() => setFeedbackOpen(true)}
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
      </>
    );
  }

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
            title="Plans"
            showProfileShortcut={false}
          />

          <SegmentedControl options={filters} value={filter} onChange={setFilter} />

          <SectionHeader title="Plan library" />
          <View style={styles.libraryGrid}>
            {plansQuery.isLoading ? (
              <GlassCard variant="compact" contentStyle={styles.stateContent}>
                <IconBubble icon="hourglass-outline" tone="amber" size={40} />
                <Text style={styles.cardTitle}>Loading plans...</Text>
              </GlassCard>
            ) : null}
            {!plansQuery.isLoading && !filteredPlans.length ? (
              <GlassCard variant="compact" style={styles.emptyPlanCard}>
                <EmptyState
                  icon="clipboard-outline"
                  title="No plan assigned"
                  body="Your trainer will create and assign a workout plan for you."
                />
              </GlassCard>
            ) : null}
            {filteredPlans.map((assignment) => (
              <Pressable
                key={assignment.id}
                onPress={() => {
                  setSelectedAssignmentId(assignment.id);
                  setView("detail");
                }}
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
        </ScrollView>
        <BottomNav selectedPath="/plans" />
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
  feedbackContent: {
    gap: spacing.md,
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
