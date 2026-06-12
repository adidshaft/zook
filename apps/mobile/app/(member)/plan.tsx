import { Ionicons } from "@expo/vector-icons";
import { resolvePlanName } from "@zook/ui";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  AnimatedAppear,
  Card,
  IconBubble,
  ListRow,
  PressableCard,
  ProgressBar,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { PlansSkeleton } from "@/components/skeletons";
import { DietPanel } from "@/features/member/plan/diet-panel";
import { useMyPlans, useMyTrackingWorkouts, type MyPlanRecord } from "@/lib/domains";
import { useSharedValue } from "@/lib/reanimated-lite";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

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
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const plansQuery = useMyPlans();
  const workoutsQuery = useMyTrackingWorkouts();
  const [activeTab, setActiveTab] = useState<"workout" | "diet">("workout");
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);
  const plans = plansQuery.data?.plans ?? [];
  const workoutPlans = plans.filter((assignment) => planKind(assignment).includes("workout"));
  const todayPlan = workoutPlans[0] ?? plans[0] ?? null;
  const recentWorkouts = (workoutsQuery.data?.workouts ?? []) as WorkoutRecord[];
  const { palette } = useTheme();

  useEffect(() => {
    const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    setActiveTab(rawTab === "diet" ? "diet" : "workout");
  }, [params.tab]);

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
          onScroll={(event) => {
            scrollY.value = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent.base} colors={[palette.accent.base]} />
          }
        >
          <ScreenHeader title="Plan" contextSlot={<RoleSwitcherContextPill />} scrollY={scrollY} />
          <AnimatedAppear delay={0}>
            <SegmentedControl
              options={[
                { label: "Workout", value: "workout" },
                { label: "Diet", value: "diet" },
              ]}
              value={activeTab}
              onChange={setActiveTab}
            />
          </AnimatedAppear>

          {activeTab === "diet" ? (
            <AnimatedAppear delay={40}>
              <DietPanel />
            </AnimatedAppear>
          ) : (
            <>
              {plansQuery.isLoading ? <PlansSkeleton /> : null}
              {plansQuery.isError ? <QueryErrorState error={plansQuery.error} onRetry={() => void plansQuery.refetch()} /> : null}

              <AnimatedAppear delay={40}>
                <SectionHeader title="Today's workout" />
                {todayPlan ? (
                  <Card variant="selected" glow contentStyle={styles.todayCard}>
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
                  </Card>
                ) : !plansQuery.isLoading ? (
                  <Card variant="compact">
                    <EmptyState icon="clipboard-outline" title="No plan assigned" body="Your trainer will assign your first plan here." />
                  </Card>
                ) : null}
              </AnimatedAppear>

              <AnimatedAppear delay={80}>
                <SectionHeader title="This week's schedule" />
                <View style={styles.stack}>
                {workoutPlans.slice(0, 4).map((assignment, index) => (
                  <PressableCard
                    key={assignment.id}
                    testID={index === 0 ? "plan-schedule-first" : `plan-schedule-${assignment.id}`}
                    onPress={() => openAssignment(assignment.id)}
                    variant="compact"
                  >
                    <ListRow
                      title={planTitle(assignment)}
                      subtitle={`${assignment.progress?.completionPct ?? 0}% complete`}
                      leading={<IconBubble icon="calendar-outline" tone="blue" />}
                      trailing={<Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />}
                    />
                  </PressableCard>
                ))}
                {!workoutPlans.length && !plansQuery.isLoading ? (
                  <Card variant="compact">
                    <EmptyState title="Schedule empty" body="Assigned workout days will appear here." />
                  </Card>
                ) : null}
                </View>
              </AnimatedAppear>

              <AnimatedAppear delay={120}>
                <SectionHeader title="Recent sessions" />
                <View style={styles.stack}>
                {recentWorkouts.slice(0, 3).map((workout, index) => (
                  <Card key={workout.id ?? `${workout.title}-${index}`} variant="compact">
                    <ListRow
                      title={workout.title ?? "Workout"}
                      subtitle={`${workout.workoutType ?? "Training"} · ${workout.durationMinutes ?? 0} min`}
                      leading={<IconBubble icon="checkmark-done-outline" tone="lime" />}
                    />
                  </Card>
                ))}
                {!recentWorkouts.length && !workoutsQuery.isLoading ? (
                  <Card variant="compact">
                    <EmptyState title="No sessions yet" body="Completed workouts and tracking history will appear here." />
                  </Card>
                ) : null}
                </View>
              </AnimatedAppear>

              <AnimatedAppear delay={160}>
                <SectionHeader title="Browse all plans" />
                <View style={styles.planGrid}>
                {plans.map((assignment) => (
                  <PressableCard
                    key={assignment.id}
                    onPress={() => openAssignment(assignment.id)}
                    padding={14}
                    style={styles.planTile}
                    contentStyle={styles.planTileContent}
                  >
                    <IconBubble icon={planKind(assignment).includes("diet") ? "nutrition-outline" : "barbell-outline"} tone={planKind(assignment).includes("diet") ? "blue" : "lime"} size={38} />
                    <Text numberOfLines={2} style={[styles.planTileTitle, { color: palette.text.primary }]}>{planTitle(assignment)}</Text>
                    <Text style={[styles.planTileMeta, { color: palette.text.secondary }]}>{assignment.progress?.completionPct ?? 0}%</Text>
                  </PressableCard>
                ))}
                </View>
              </AnimatedAppear>
            </>
          )}
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    alignSelf: "center",
    gap: spacing.lg,
    maxWidth: layout.contentWidth,
    paddingBottom: layout.bottomNavContentPadding,
    paddingTop: 20,
    width: "100%",
  },
  stack: { gap: spacing.sm },
  todayCard: { gap: spacing.md },
  todayTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  todayCopy: { flex: 1, gap: 4 },
  todayTitle: typography.title,
  todayMeta: typography.small,
  planGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  planTile: {
    flexGrow: 1,
    minWidth: "47%",
  },
  planTileContent: {
    gap: spacing.sm,
    minHeight: 126,
  },
  planTileTitle: typography.cardTitle,
  planTileMeta: typography.caption,
});
