import { Ionicons } from "@expo/vector-icons";
import { resolvePlanName } from "@zook/ui";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  GlassCard,
  IconBubble,
  ListRow,
  MobileHeader,
  ProgressBar,
  QueryErrorState,
  SectionHeader,
  StatusChip,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { PlansSkeleton } from "@/components/skeletons";
import { useMyPlans, useMyTrackingWorkouts, type MyPlanRecord } from "@/lib/domains";
import { useMyDiet } from "@/lib/domains/tracking/queries";
import { legacyColors, layout, spacing, typography, useTheme } from "@/lib/theme";

type WorkoutRecord = {
  id?: string;
  title?: string;
  workoutType?: string;
  startedAt?: string;
  durationMinutes?: number | null;
};

function planTitle(assignment?: MyPlanRecord | null) {
  return resolvePlanName(assignment?.plan) || "Assigned plan";
}

function planKind(assignment?: MyPlanRecord | null) {
  return (assignment?.plan?.type ?? "WORKOUT").toLowerCase();
}

export default function MemberPlanScreen() {
  const router = useRouter();
  const plansQuery = useMyPlans();
  const workoutsQuery = useMyTrackingWorkouts();
  const dietQuery = useMyDiet();
  const [refreshing, setRefreshing] = useState(false);
  const plans = plansQuery.data?.plans ?? [];
  const workoutPlans = plans.filter((assignment) => planKind(assignment).includes("workout"));
  const todayPlan = workoutPlans[0] ?? plans[0] ?? null;
  const recentWorkouts = (workoutsQuery.data?.workouts ?? []) as WorkoutRecord[];
  const dietPlan = dietQuery.data?.plan ?? null;
  const dietLogs = dietQuery.data?.logs ?? [];
  const loggedCalories = dietLogs.reduce((total, log) => total + (log.calories ?? 0), 0);
  const { palette } = useTheme();

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([plansQuery.refetch(), workoutsQuery.refetch(), dietQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  function openAssignment(id: string) {
    router.push(`/plan/${id}` as never);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="member-plan-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent.base} colors={[palette.accent.base]} />
          }
        >
          <MobileHeader title="Plan" subtitle="Workouts, schedule, and history" showProfileShortcut={false} />

          {plansQuery.isLoading ? <PlansSkeleton /> : null}
          {plansQuery.isError ? <QueryErrorState error={plansQuery.error} onRetry={() => void plansQuery.refetch()} /> : null}

          <SectionHeader title="Today's workout" />
          {todayPlan ? (
            <GlassCard variant="selected" glow contentStyle={styles.todayCard}>
              <View style={styles.todayTop}>
                <IconBubble icon="barbell-outline" tone="lime" size={46} />
                <View style={styles.todayCopy}>
                  <Text numberOfLines={1} style={[styles.todayTitle, { color: palette.text.primary }]}>{planTitle(todayPlan)}</Text>
                  <Text numberOfLines={1} style={[styles.todayMeta, { color: palette.text.secondary }]}>{planKind(todayPlan)} · trainer assigned</Text>
                </View>
              </View>
              <ProgressBar value={(todayPlan.progress?.completionPct ?? 0) / 100} label="Progress" />
              <ZookButton testID="plan-start-today" onPress={() => openAssignment(todayPlan.id)} icon="play-outline" fullWidth>
                Start today
              </ZookButton>
            </GlassCard>
          ) : !plansQuery.isLoading ? (
            <GlassCard variant="compact">
              <EmptyState icon="clipboard-outline" title="No plan assigned" body="Your trainer will assign your first plan here." />
            </GlassCard>
          ) : null}

          <SectionHeader title="This week's schedule" />
          <View style={styles.stack}>
            {workoutPlans.slice(0, 4).map((assignment, index) => (
              <Pressable
                key={assignment.id}
                testID={index === 0 ? "plan-schedule-first" : `plan-schedule-${assignment.id}`}
                onPress={() => openAssignment(assignment.id)}
                accessibilityRole="button"
              >
                <GlassCard variant="compact">
                  <ListRow
                    title={planTitle(assignment)}
                    subtitle={`${assignment.progress?.completionPct ?? 0}% complete`}
                    leading={<IconBubble icon="calendar-outline" tone="blue" />}
                    trailing={<Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />}
                  />
                </GlassCard>
              </Pressable>
            ))}
            {!workoutPlans.length && !plansQuery.isLoading ? (
              <GlassCard variant="compact">
                <EmptyState title="Schedule empty" body="Assigned workout days will appear here." />
              </GlassCard>
            ) : null}
          </View>

          <SectionHeader title="Recent sessions" />
          <View style={styles.stack}>
            {recentWorkouts.slice(0, 3).map((workout, index) => (
              <GlassCard key={workout.id ?? `${workout.title}-${index}`} variant="compact">
                <ListRow
                  title={workout.title ?? "Workout"}
                  subtitle={`${workout.workoutType ?? "Training"} · ${workout.durationMinutes ?? 0} min`}
                  leading={<IconBubble icon="checkmark-done-outline" tone="lime" />}
                />
              </GlassCard>
            ))}
            {!recentWorkouts.length && !workoutsQuery.isLoading ? (
              <GlassCard variant="compact">
                <EmptyState title="No sessions yet" body="Completed workouts and tracking history will appear here." />
              </GlassCard>
            ) : null}
          </View>

          <SectionHeader title="Diet plan" subtitle="Meals now live inside Plan." />
          <Pressable
            testID="plan-open-diet"
            onPress={() => router.push("/diet" as never)}
            accessibilityRole="button"
          >
            <GlassCard variant="compact">
              <ListRow
                title={dietPlan?.title ?? "Meal logging"}
                subtitle={
                  dietPlan
                    ? `${loggedCalories} / ${dietPlan.calorieTarget ?? "-"} kcal today`
                    : "Open meal logging and trainer-published diet details"
                }
                leading={<IconBubble icon="nutrition-outline" tone="blue" />}
                trailing={
                  <View style={styles.dietTrailing}>
                    <StatusChip status={dietPlan ? "Active" : "Open"} tone={dietPlan ? "lime" : "neutral"} />
                    <Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />
                  </View>
                }
              />
            </GlassCard>
          </Pressable>

          <SectionHeader title="Browse all plans" />
          <View style={styles.planGrid}>
            {plans.map((assignment) => (
              <Pressable key={assignment.id} onPress={() => openAssignment(assignment.id)} accessibilityRole="button" style={[styles.planTile, { backgroundColor: palette.bg.elevated, borderColor: palette.border.subtle }]}>
                <IconBubble icon={planKind(assignment).includes("diet") ? "nutrition-outline" : "barbell-outline"} tone={planKind(assignment).includes("diet") ? "blue" : "lime"} size={38} />
                <Text numberOfLines={2} style={[styles.planTileTitle, { color: palette.text.primary }]}>{planTitle(assignment)}</Text>
                <Text style={[styles.planTileMeta, { color: palette.text.secondary }]}>{assignment.progress?.completionPct ?? 0}%</Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.md,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: 20,
    width: "100%",
  },
  stack: { gap: spacing.sm },
  todayCard: { gap: spacing.md },
  todayTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  todayCopy: { flex: 1, gap: 4 },
  todayTitle: { color: legacyColors.text, ...typography.title },
  todayMeta: { color: legacyColors.muted, ...typography.small },
  planGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  planTile: {
    backgroundColor: legacyColors.panel,
    borderColor: legacyColors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 126,
    minWidth: "47%",
    padding: 14,
  },
  planTileTitle: { color: legacyColors.text, ...typography.cardTitle },
  planTileMeta: { color: legacyColors.muted, ...typography.caption },
  dietTrailing: { alignItems: "center", flexDirection: "row", gap: 8 },
});
