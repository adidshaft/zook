import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { zookDemoFixtures } from "@zook/core";
import {
  Card,
  Dock,
  IconBubble,
  ListRow,
  Pill,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SectionHeader,
  SegmentedControl,
} from "@/components/primitives";
import { colors } from "@/lib/theme";

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
  { id: "machine", title: "Chest press machine guide", meta: "Machine Guide · Form cues", tone: "neutral" as const },
];

export default function Plans() {
  const [view, setView] = useState<PlanView>("assigned");
  const [filter, setFilter] = useState<PlanFilter>("all");
  const [completed, setCompleted] = useState(new Set(["Bench Press", "Incline Dumbbell Press"]));
  const completedCount = completed.size;
  const exercises = plan?.exercises ?? [];
  const progressPct = Math.round((completedCount / Math.max(exercises.length, 1)) * 100);

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
      <Screen>
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <View style={styles.headerRow}>
            <View style={styles.headerCopy}>
              <Text style={styles.eyebrow}>Assigned by {coach?.name ?? "Coach Rhea"}</Text>
              <Text style={styles.title}>{plan?.title ?? "Push Day"}</Text>
              <Text style={styles.subtitle}>
                6 exercises · {plan?.durationLabel ?? "45-60 min"} · Difficulty: {plan?.difficulty ?? "Medium"}
              </Text>
            </View>
            <Pill tone="lime">Assigned</Pill>
          </View>

          <Card style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <View>
                <Text style={styles.cardTitle}>Workout progress</Text>
                <Text style={styles.cardBody}>{completedCount} of {exercises.length} completed</Text>
              </View>
              <Text style={styles.progressText}>{progressPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
          </Card>

          <SectionHeader title="Exercises" subtitle="Mark sets complete as you finish them." />
          <View style={styles.stack}>
            {exercises.map((exercise) => {
              const done = completed.has(exercise.name);
              return (
                <Pressable
                  key={exercise.name}
                  onPress={() => toggleExercise(exercise.name)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: done }}
                >
                  <ListRow
                    title={exercise.name}
                    subtitle={`${exercise.sets} · ${exercise.equipment} · ${exercise.reps}`}
                    leading={<IconBubble icon={done ? "checkmark" : "ellipse-outline"} tone={done ? "lime" : "neutral"} size={42} />}
                    trailing={<Pill tone={done ? "lime" : "neutral"}>{done ? "Done" : "Open"}</Pill>}
                  />
                </Pressable>
              );
            })}
          </View>

          <View style={styles.actionRow}>
            <SecondaryButton onPress={() => setView("assigned")} style={styles.actionHalf}>
              Back
            </SecondaryButton>
            <PrimaryButton onPress={() => setCompleted(new Set(exercises.map((exercise) => exercise.name)))} style={styles.actionHalf}>
              Complete
            </PrimaryButton>
          </View>
          <SecondaryButton onPress={() => {}}>Send Feedback</SecondaryButton>
        </ScrollView>
        <Dock />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>Plans</Text>
            <Text style={styles.title}>Assigned training</Text>
            <Text style={styles.subtitle}>Workout, diet, routine, recovery, trainer notes, advisories, and guides.</Text>
          </View>
          <IconBubble icon="reader-outline" tone="lime" />
        </View>

        <SegmentedControl options={filters} value={filter} onChange={setFilter} />

        <Card style={styles.featuredPlan}>
          <View style={styles.featuredTop}>
            <View>
              <Text style={styles.eyebrow}>Today</Text>
              <Text style={styles.cardTitle}>Push Day</Text>
            </View>
            <Pill tone="lime">In Progress</Pill>
          </View>
          <Text style={styles.cardBody}>Bench Press, Incline Dumbbell Press, Shoulder Press, Tricep Pushdown, Lateral Raise, Push-up Finisher.</Text>
          <View style={styles.planMeta}>
            <Pill tone="neutral">6 exercises</Pill>
            <Pill tone="blue">45-60 min</Pill>
            <Pill tone="amber">Medium</Pill>
          </View>
          <PrimaryButton onPress={() => setView("detail")}>Open Push Day</PrimaryButton>
        </Card>

        <SectionHeader title="Plan library" subtitle="Only plans assigned to you are visible here." />
        <View style={styles.stack}>
          {planCards.map((item) => (
            <Pressable key={item.id} onPress={() => item.id === "push" && setView("detail")} accessibilityRole="button">
              <ListRow
                title={item.title}
                subtitle={item.meta}
                leading={<IconBubble icon={item.id === "push" ? "barbell-outline" : "document-text-outline"} tone={item.tone} />}
                trailing={<Pill tone={item.tone}>{item.id === "push" ? "Assigned" : "Queued"}</Pill>}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>
      <Dock />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 120,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerCopy: {
    flex: 1,
    gap: 8,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  title: {
    color: colors.text,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "900",
  },
  subtitle: {
    color: colors.muted,
    lineHeight: 22,
  },
  stack: {
    gap: 12,
  },
  featuredPlan: {
    gap: 14,
    borderColor: "rgba(185,244,85,0.25)",
    backgroundColor: "rgba(185,244,85,0.08)",
  },
  featuredTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "900",
  },
  cardBody: {
    color: colors.muted,
    lineHeight: 21,
  },
  planMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  progressCard: {
    gap: 14,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  progressText: {
    color: colors.lime,
    fontSize: 28,
    fontWeight: "900",
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.lime,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionHalf: {
    flex: 1,
  },
});
