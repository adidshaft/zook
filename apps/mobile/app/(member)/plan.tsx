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
  ProgressBar,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { MemberHeaderActions } from "@/components/member-header-actions";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { PlansSkeleton } from "@/components/skeletons";
import { DietPanel } from "@/features/member/plan/diet-panel";
import { useMyPlans, usePlanExercises, type MyPlanRecord } from "@/lib/domains";
import { useSharedValue } from "@/lib/reanimated-lite";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

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
  const [activeTab, setActiveTab] = useState<"workout" | "diet">("workout");
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);
  const plans = plansQuery.data?.plans ?? [];
  const workoutPlans = plans.filter((assignment) => planKind(assignment).includes("workout"));
  const todayPlan = workoutPlans[0] ?? plans[0] ?? null;
  const singleWorkoutPlan = workoutPlans.length === 1 ? workoutPlans[0] : null;
  const exercisePreviewQuery = usePlanExercises(singleWorkoutPlan?.id);
  const exercisePreview = exercisePreviewQuery.data?.exercises.slice(0, 3) ?? [];
  // Don't repeat today's plan in the schedule list below.
  const upcomingPlans = workoutPlans.filter((assignment) => assignment.id !== todayPlan?.id);
  const { palette } = useTheme();

  useEffect(() => {
    const rawTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    setActiveTab(rawTab === "diet" ? "diet" : "workout");
  }, [params.tab]);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await plansQuery.refetch();
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
          <ScreenHeader title="Plan" contextSlot={<RoleSwitcherContextPill />} trailing={<MemberHeaderActions showBell={false} />} scrollY={scrollY} />
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
                  <Card variant="selected" contentStyle={styles.todayCard}>
                    <View style={styles.todayTop}>
                      <IconBubble icon="barbell-outline" tone="blue" size={46} />
                      <View style={styles.todayCopy}>
                        <Text numberOfLines={1} style={[styles.todayTitle, { color: palette.text.primary }]}>{planTitle(todayPlan)}</Text>
                        <Text numberOfLines={1} style={[styles.todayMeta, { color: palette.text.secondary }]}>{planKind(todayPlan)} · trainer assigned</Text>
                      </View>
                    </View>
                    <ProgressBar value={(todayPlan.progress?.completionPct ?? 0) / 100} label="Progress" />
                    <ZookButton testID="plan-start-today" onPress={() => openAssignment(todayPlan.id)} icon="play-outline" fullWidth>
                      Open today plan
                    </ZookButton>
                  </Card>
                ) : !plansQuery.isLoading ? (
                  <Card variant="compact">
                    <EmptyState icon="clipboard-outline" title="No plan assigned" body="Your first trainer plan appears here." />
                  </Card>
                ) : null}
              </AnimatedAppear>

              {upcomingPlans.length ? (
                <AnimatedAppear delay={80}>
                  <SectionHeader title="More plans" />
                  <View style={styles.stack}>
                  {upcomingPlans.map((assignment, index) => (
                    <Card
                      key={assignment.id}
                      testID={index === 0 ? "plan-schedule-first" : `plan-schedule-${assignment.id}`}
                      onPress={() => openAssignment(assignment.id)}
                      pressable
                      variant="compact"
                    >
                      <ListRow
                        title={planTitle(assignment)}
                        subtitle={`${assignment.progress?.completionPct ?? 0}% complete`}
                        leading={<IconBubble icon="calendar-outline" tone="neutral" />}
                        trailing={<Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />}
                      />
                    </Card>
                  ))}
                  </View>
                </AnimatedAppear>
              ) : null}

              {singleWorkoutPlan ? (
                <AnimatedAppear delay={80}>
                  <SectionHeader title="Inside this plan" />
                  <Card variant="compact" contentStyle={styles.previewCard}>
                    {exercisePreviewQuery.isLoading ? (
                      <View style={styles.previewLoading}>
                        <IconBubble icon="barbell-outline" tone="neutral" size={42} />
                        <View style={styles.previewCopy}>
                          <Text style={[styles.previewTitle, { color: palette.text.primary }]}>
                            Loading exercises
                          </Text>
                          <Text style={[styles.previewMeta, { color: palette.text.secondary }]}>
                            Checking the latest plan details...
                          </Text>
                        </View>
                      </View>
                    ) : exercisePreview.length ? (
                      <>
                        {exercisePreview.map((exercise, index) => (
                          <ListRow
                            key={exercise.id}
                            title={exercise.name}
                            subtitle={[exercise.sets, exercise.reps].filter(Boolean).join(" · ") || exercise.day || "Coach guided"}
                            leading={<IconBubble icon={index === 0 ? "flash-outline" : "barbell-outline"} tone="neutral" />}
                          />
                        ))}
                        <ZookButton
                          testID="plan-preview-open"
                          onPress={() => openAssignment(singleWorkoutPlan.id)}
                          icon="list-outline"
                          variant="secondary"
                          fullWidth
                        >
                          View full exercise list
                        </ZookButton>
                      </>
                    ) : (
                      <EmptyState
                        icon="barbell-outline"
                        title="No exercises yet"
                        body="Assigned exercise details appear here after your coach publishes them."
                      />
                    )}
                  </Card>
                </AnimatedAppear>
              ) : null}
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
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  stack: { gap: spacing.sm },
  previewCard: { gap: spacing.sm },
  previewCopy: { flex: 1, gap: 4 },
  previewLoading: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  previewTitle: typography.cardTitle,
  previewMeta: typography.small,
  todayCard: { gap: spacing.md },
  todayTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  todayCopy: { flex: 1, gap: 4 },
  todayTitle: typography.headerTitle,
  todayMeta: typography.small,
});
