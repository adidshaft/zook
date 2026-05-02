import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
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

function SwipeExerciseRow({
  exercise,
  complete,
  onToggle,
  onDelete,
}: {
  exercise: PlanExercise;
  complete: boolean;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const openRef = useRef(false);
  const ignorePressRef = useRef(false);
  const [open, setOpen] = useState(false);

  function snapTo(value: number) {
    const nextOpen = value < 0;
    openRef.current = nextOpen;
    setOpen(nextOpen);
    Animated.spring(translateX, {
      toValue: value,
      friction: 9,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 12 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: (_, gesture) => {
        ignorePressRef.current = true;
        const start = openRef.current ? -86 : 0;
        const next = Math.max(-86, Math.min(0, start + gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_, gesture) => {
        const shouldOpen = gesture.dx < -38 || (openRef.current && gesture.dx < 24);
        snapTo(shouldOpen ? -86 : 0);
        setTimeout(() => {
          ignorePressRef.current = false;
        }, 120);
      },
      onPanResponderTerminate: () => {
        snapTo(openRef.current ? -86 : 0);
        setTimeout(() => {
          ignorePressRef.current = false;
        }, 120);
      },
    }),
  ).current;

  function handleToggle() {
    if (ignorePressRef.current) {
      return;
    }
    if (openRef.current) {
      snapTo(0);
      return;
    }
    onToggle();
  }

  return (
    <View style={styles.swipeShell}>
      <Pressable
        onPress={onDelete}
        pointerEvents={open ? "auto" : "none"}
        accessibilityRole="button"
        accessibilityLabel={`Delete ${exercise.name}`}
        style={[styles.deleteAction, open ? styles.deleteActionOpen : null]}
      >
        <Ionicons name="trash-outline" size={22} color={colors.text} />
      </Pressable>
      <Animated.View style={[styles.swipeForeground, { transform: [{ translateX }] }]} {...panResponder.panHandlers}>
        <ExerciseRow
          title={exercise.name}
          sets={exercise.sets}
          detail={`${exercise.equipment} · ${exercise.reps}`}
          complete={complete}
          onPress={handleToggle}
          style={styles.swipeRow}
        />
      </Animated.View>
    </View>
  );
}

export default function Plans() {
  const router = useRouter();
  const params = useLocalSearchParams<{ view?: string | string[] }>();
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
    plans.find((assignment) => assignment.id === selectedAssignmentId) ?? filteredPlans[0] ?? plans[0] ?? null;
  const exercisesQuery = usePlanExercises(selectedAssignment?.id);
  const coachName = "Coach";
  const completedCount = exercises.filter((exercise) => completed.has(exercise.name)).length;
  const progress = completedCount / Math.max(exercises.length, 1);

  useEffect(() => {
    if (firstParam(params.view) === "detail") {
      setView("detail");
    }
  }, [params.view]);

  useEffect(() => {
    if (!selectedAssignmentId && plans[0]) {
      setSelectedAssignmentId(plans[0].id);
    }
  }, [plans, selectedAssignmentId]);

  useEffect(() => {
    const apiExercises = exercisesQuery.data?.exercises ?? [];
    setExercises(apiExercises.map(exerciseFromApi));
    setCompleted(new Set(apiExercises.filter((exercise) => exercise.completed).map((exercise) => exercise.name)));
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

  function addExercise() {
    setExercises((current) => {
      let nextIndex = current.length + 1;
      while (current.some((exercise) => exercise.name === `New exercise ${nextIndex}`)) {
        nextIndex += 1;
      }
      return [
        ...current,
        {
          name: `New exercise ${nextIndex}`,
          sets: "3 sets",
          equipment: "Any",
          reps: "10 reps",
        },
      ];
    });
  }

  function deleteExercise(name: string) {
    setExercises((current) => current.filter((exercise) => exercise.name !== name));
    setCompleted((current) => {
      const next = new Set(current);
      next.delete(name);
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
                <Text numberOfLines={1} style={styles.detailTitle}>{planTitle(selectedAssignment)}</Text>
                <Text numberOfLines={1} style={styles.detailSubtitle}>Coach {coachName}</Text>
              </View>
              <Pressable
                onPress={() => setFeedbackOpen((current) => !current)}
                accessibilityRole="button"
                accessibilityLabel="Tell coach"
                style={[styles.iconButton, feedbackOpen ? styles.iconButtonActive : null]}
              >
                <Ionicons name="information-outline" size={22} color={feedbackOpen ? colors.bg : colors.text} />
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
                <ZookButton onPress={sendFeedback} icon="send-outline" style={styles.feedbackSendButton}>Send</ZookButton>
              </GlassCard>
            ) : null}

            {feedbackStatus ? <Text style={styles.inlineStatus}>{feedbackStatus}</Text> : null}

            <GlassCard variant="selected" contentStyle={styles.progressContent}>
              <View style={styles.progressHeader}>
                <View style={styles.progressCopy}>
                  <Text style={styles.cardTitle}>Workout progress</Text>
                  <Text style={styles.cardBody}>{completedCount} of {exercises.length} completed</Text>
                </View>
                <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
              </View>
              <ProgressBar value={progress} label="Today" />
            </GlassCard>

            <SectionHeader
              title="Exercises"
              action={
                <Pressable
                  onPress={addExercise}
                  accessibilityRole="button"
                  accessibilityLabel="Add exercise"
                  style={styles.addExerciseButton}
                >
                  <Ionicons name="add" size={22} color={colors.bg} />
                </Pressable>
              }
            />
            <View style={styles.stack}>
              {exercisesQuery.isLoading ? (
                <GlassCard variant="compact" contentStyle={styles.stateContent}>
                  <IconBubble icon="hourglass-outline" tone="amber" size={40} />
                  <Text style={styles.cardTitle}>Loading exercises...</Text>
                </GlassCard>
              ) : null}
              {!exercisesQuery.isLoading && !exercises.length ? (
                <GlassCard variant="compact">
                  <EmptyState title="No exercises yet" body="Assigned exercise details will appear here once your coach publishes them." />
                </GlassCard>
              ) : null}
              {exercises.map((exercise) => (
                <SwipeExerciseRow
                  key={exercise.name}
                  exercise={exercise}
                  complete={completed.has(exercise.name)}
                  onToggle={() => toggleExercise(exercise.name)}
                  onDelete={() => deleteExercise(exercise.name)}
                />
              ))}
            </View>
          </ScrollView>
          <StickyActionBar>
            <ZookButton
              onPress={() => void completeWorkout()}
              disabled={!selectedAssignment || completePlan.isPending}
              icon="checkmark-circle-outline"
            >
              {completePlan.isPending ? "Completing..." : "Complete Workout"}
            </ZookButton>
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
            title="Plan"
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
                <EmptyState title="No plans assigned" body="Workout and diet plans from your coach will show up here." />
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
                  icon={planKind(assignment).includes("diet") ? "nutrition-outline" : "barbell-outline"}
                  tone={planKind(assignment).includes("diet") ? "blue" : "lime"}
                  size={42}
                />
                <Text style={styles.libraryTitle}>{planTitle(assignment)}</Text>
                <Text style={styles.libraryDetail}>{assignment.progress?.completionPct ?? 0}% complete</Text>
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
  addExerciseButton: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.lime,
    alignItems: "center",
    justifyContent: "center",
  },
  swipeShell: {
    width: "100%",
    alignSelf: "stretch",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "transparent",
  },
  swipeForeground: {
    width: "100%",
    alignSelf: "stretch",
    zIndex: 1,
  },
  swipeRow: {
    width: "100%",
  },
  deleteAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 86,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
    opacity: 0,
  },
  deleteActionOpen: {
    opacity: 1,
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
});
