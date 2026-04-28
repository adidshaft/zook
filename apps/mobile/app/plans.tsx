import { Stack } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { zookDemoFixtures } from "@zook/core";
import {
  BottomNav,
  ExerciseRow,
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  ProgressBar,
  SecondaryButton,
  SectionHeader,
  SegmentedControl,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { colors, layout, spacing, typography } from "@/lib/theme";

type PlanView = "assigned" | "detail";
type PlanFilter = "all" | "workout" | "diet" | "routine" | "recovery";

const plan = zookDemoFixtures.trainingPlans[0];
const coach = zookDemoFixtures.users.find((user) => user.id === plan?.trainerUserId);
const filters: Array<{ label: string; value: PlanFilter }> = [
  { label: "All", value: "all" },
  { label: "Workout", value: "workout" },
  { label: "Diet", value: "diet" },
  { label: "Routine", value: "routine" },
  { label: "Recovery", value: "recovery" },
];

const planCards = [
  { id: "push", title: "Push Day", meta: "Workout · 6 exercises · Coach Rhea", tone: "lime" as const },
  { id: "diet", title: "High-protein vegetarian notes", meta: "Diet · Trainer note", tone: "blue" as const },
  { id: "routine", title: "Weekly routine", meta: "Routine · 5 day split", tone: "amber" as const },
  { id: "recovery", title: "Shoulder mobility", meta: "Recovery · 12 min", tone: "violet" as const },
];

export default function Plans() {
  const [view, setView] = useState<PlanView>("assigned");
  const [filter, setFilter] = useState<PlanFilter>("all");
  const [completed, setCompleted] = useState(new Set(["Bench Press", "Incline Dumbbell Press"]));
  const exercises = plan?.exercises ?? [];
  const completedCount = completed.size;
  const progress = completedCount / Math.max(exercises.length, 1);

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

  if (view === "detail") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <ZookScreen>
          <ScrollView
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
          >
            <MobileHeader
              title={plan?.title ?? "Push Day"}
              subtitle={`Assigned by ${coach?.name ?? "Coach Rhea"}`}
              leading={
                <Pressable
                  onPress={() => setView("assigned")}
                  accessibilityRole="button"
                  accessibilityLabel="Back to plans"
                  style={styles.iconButton}
                >
                  <Text style={styles.backIcon}>‹</Text>
                </Pressable>
              }
              chip={<StatusChip status="Assigned" />}
            />

            <GlassCard variant="selected" contentStyle={styles.progressContent}>
              <View style={styles.progressHeader}>
                <View style={styles.progressCopy}>
                  <Text style={styles.cardTitle}>Workout progress</Text>
                  <Text style={styles.cardBody}>{completedCount} of {exercises.length} completed</Text>
                </View>
                <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
              </View>
              <ProgressBar value={progress} label="Plan cycle" />
            </GlassCard>

            <SectionHeader title="Exercises" subtitle="Mark sets complete as you finish them." />
            <View style={styles.stack}>
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

            <View style={styles.actionRow}>
              <SecondaryButton onPress={() => {}} style={styles.actionHalf} icon="chatbubble-outline">
                Send Feedback
              </SecondaryButton>
              <ZookButton
                onPress={() => setCompleted(new Set(exercises.map((exercise) => exercise.name)))}
                style={styles.actionHalf}
                icon="checkmark-circle-outline"
              >
                Complete Workout
              </ZookButton>
            </View>
          </ScrollView>
          <BottomNav selectedPath="/plans" />
        </ZookScreen>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            eyebrow="Plans"
            title="Assigned training"
            subtitle="Workout, diet, routine, recovery, and trainer notes."
            trailing={<IconBubble icon="reader-outline" tone="lime" />}
          />

          <SegmentedControl options={filters} value={filter} onChange={setFilter} />

          <GlassCard variant="selected" contentStyle={styles.featuredContent}>
            <View style={styles.featuredTop}>
              <View style={styles.progressCopy}>
                <Text style={styles.eyebrow}>Today</Text>
                <Text style={styles.cardTitle}>Push Day</Text>
              </View>
              <StatusChip status="Assigned" />
            </View>
            <Text style={styles.cardBody}>
              Bench Press, Incline Dumbbell Press, Shoulder Press, Tricep Pushdown, Lateral Raise, Push-up Finisher.
            </Text>
            <View style={styles.planMeta}>
              <StatusChip status="6 exercises" tone="neutral" />
              <StatusChip status="45-60 min" tone="neutral" />
              <StatusChip status="Medium" tone="amber" />
            </View>
            <ZookButton onPress={() => setView("detail")} icon="barbell-outline">Open Push Day</ZookButton>
          </GlassCard>

          <SectionHeader title="Plan library" subtitle="Only plans assigned to you are visible here." />
          <View style={styles.stack}>
            {planCards.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => item.id === "push" && setView("detail")}
                accessibilityRole="button"
              >
                <ListRow
                  title={item.title}
                  subtitle={item.meta}
                  leading={<IconBubble icon={item.id === "push" ? "barbell-outline" : "document-text-outline"} tone={item.tone} />}
                  trailing={<StatusChip status={item.id === "push" ? "Assigned" : "Queued"} tone={item.tone} />}
                />
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
    paddingBottom: 128,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  backIcon: {
    color: colors.text,
    fontSize: 30,
    lineHeight: 32,
  },
  stack: {
    gap: 10,
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
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionHalf: {
    flex: 1,
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
    gap: spacing.sm,
  },
});
