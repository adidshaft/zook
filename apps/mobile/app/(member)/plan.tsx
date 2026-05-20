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
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { PlansSkeleton } from "@/components/skeletons";
import { useMyPlans, useMyTrackingWorkouts, type MyPlanRecord } from "@/lib/query-hooks";
import { colors, layout, spacing, typography } from "@/lib/theme";

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
  const [refreshing, setRefreshing] = useState(false);
  const plans = plansQuery.data?.plans ?? [];
  const workoutPlans = plans.filter((assignment) => planKind(assignment).includes("workout"));
  const todayPlan = workoutPlans[0] ?? plans[0] ?? null;
  const recentWorkouts = (workoutsQuery.data?.workouts ?? []) as WorkoutRecord[];

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([plansQuery.refetch(), workoutsQuery.refetch()]);
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
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.lime} colors={[colors.lime]} />
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
                  <Text numberOfLines={1} style={styles.todayTitle}>{planTitle(todayPlan)}</Text>
                  <Text numberOfLines={1} style={styles.todayMeta}>{planKind(todayPlan)} · trainer assigned</Text>
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
                    trailing={<Ionicons name="chevron-forward" size={18} color={colors.muted} />}
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

          <SectionHeader title="Browse all plans" />
          <View style={styles.planGrid}>
            {plans.map((assignment) => (
              <Pressable key={assignment.id} onPress={() => openAssignment(assignment.id)} accessibilityRole="button" style={styles.planTile}>
                <IconBubble icon={planKind(assignment).includes("diet") ? "nutrition-outline" : "barbell-outline"} tone={planKind(assignment).includes("diet") ? "blue" : "lime"} size={38} />
                <Text numberOfLines={2} style={styles.planTileTitle}>{planTitle(assignment)}</Text>
                <Text style={styles.planTileMeta}>{assignment.progress?.completionPct ?? 0}%</Text>
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
    paddingTop: 14,
    width: "100%",
  },
  stack: { gap: spacing.sm },
  todayCard: { gap: spacing.md },
  todayTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  todayCopy: { flex: 1, gap: 4 },
  todayTitle: { color: colors.text, ...typography.title },
  todayMeta: { color: colors.muted, ...typography.small },
  planGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  planTile: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderRadius: 18,
    borderWidth: 1,
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 126,
    minWidth: "47%",
    padding: 14,
  },
  planTileTitle: { color: colors.text, ...typography.cardTitle },
  planTileMeta: { color: colors.muted, ...typography.caption },
});
