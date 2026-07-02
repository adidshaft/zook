import { Ionicons } from "@expo/vector-icons";
import { resolvePlanName } from "@zook/ui";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  AnimatedAppear,
  Card,
  HeaderActions,
  IconBubble,
  ListRow,
  ProgressBar,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  SegmentedControl,
  Skeleton,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { PlansSkeleton } from "@/components/skeletons";
import { DietPanel } from "@/features/member/plan/diet-panel";
import { useMyPlans, usePlanExercises, type MyPlanRecord } from "@/lib/domains";
import { useT } from "@/lib/i18n";
import { useSharedValue } from "@/lib/reanimated-lite";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

function planTitle(assignment: MyPlanRecord | null | undefined, fallback: string) {
  return resolvePlanName(assignment?.plan) || fallback;
}

function planKind(assignment?: MyPlanRecord | null) {
  return (assignment?.plan?.type ?? "WORKOUT").toLowerCase();
}

function planCompletion(assignment: MyPlanRecord) {
  return assignment.progress?.completionPct ?? 0;
}

function planUpdatedAt(assignment: MyPlanRecord) {
  const timestamp = new Date(assignment.createdAt ?? 0).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function planActionPriority(assignment: MyPlanRecord) {
  if (assignment.active === false) return 4;
  const completion = planCompletion(assignment);
  if (completion <= 0) return 0;
  if (completion < 100) return 1;
  return 3;
}

export default function MemberPlanScreen() {
  const router = useRouter();
  const t = useT();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const plansQuery = useMyPlans();
  const [activeTab, setActiveTab] = useState<"workout" | "diet">("workout");
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);
  const plans = plansQuery.data?.plans ?? [];
  const workoutPlans = plans
    .filter((assignment) => planKind(assignment).includes("workout"))
    .sort((left, right) => {
      const priority = planActionPriority(left) - planActionPriority(right);
      return (
        priority ||
        planCompletion(left) - planCompletion(right) ||
        planUpdatedAt(right) - planUpdatedAt(left)
      );
    });
  const nextWorkoutPlan = workoutPlans[0] ?? null;
  const singleWorkoutPlan = workoutPlans.length === 1 ? workoutPlans[0] : null;
  const exercisePreviewQuery = usePlanExercises(singleWorkoutPlan?.id);
  const exercisePreview = exercisePreviewQuery.data?.exercises.slice(0, 3) ?? [];
  const upcomingPlans = workoutPlans.filter((assignment) => assignment.id !== nextWorkoutPlan?.id);
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
          <ScreenHeader title={t("member.plan.title")} contextSlot={<RoleSwitcherContextPill />} trailing={<HeaderActions showBell showProfileShortcut={false} />} scrollY={scrollY} />
          <AnimatedAppear delay={0}>
            <SegmentedControl
              options={[
                { label: t("member.plan.workoutTab"), value: "workout" },
                { label: t("member.plan.dietTab"), value: "diet" },
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
                <SectionHeader title={t("member.plan.nextWorkout")} />
                {nextWorkoutPlan ? (
                  <Card variant="selected" contentStyle={styles.todayCard}>
                    <View style={styles.todayTop}>
                      <IconBubble icon="barbell-outline" tone="blue" size={46} />
                      <View style={styles.todayCopy}>
                        <Text numberOfLines={1} style={[styles.todayTitle, { color: palette.text.primary }]}>
                          {planTitle(nextWorkoutPlan, t("member.plan.assignedPlan"))}
                        </Text>
                        <Text numberOfLines={1} style={[styles.todayMeta, { color: palette.text.secondary }]}>
                          {t("member.plan.trainerAssigned")}
                        </Text>
                      </View>
                    </View>
                    <ProgressBar value={(nextWorkoutPlan.progress?.completionPct ?? 0) / 100} label={t("member.plan.progress")} />
                    {singleWorkoutPlan ? (
                      <View style={[styles.inlinePreview, { borderColor: palette.border.subtle }]}>
                        {exercisePreviewQuery.isError ? (
                          <QueryErrorState
                            error={exercisePreviewQuery.error}
                            onRetry={() => void exercisePreviewQuery.refetch()}
                            title={t("member.plan.couldNotLoadExercises")}
                          />
                        ) : exercisePreviewQuery.isLoading ? (
                          <View style={styles.previewSkeleton}>
                            {[0, 1, 2].map((item) => (
                              <Skeleton key={item} width="90%" height={14} borderRadius={7} />
                            ))}
                          </View>
                        ) : exercisePreview.length ? (
                          exercisePreview.map((exercise, index) => (
                            <View
                              key={exercise.id}
                              style={[
                                styles.exercisePreviewRow,
                                { backgroundColor: palette.surface.default },
                              ]}
                            >
                              <View style={styles.exercisePreviewIcon}>
                                <Ionicons
                                  name={index === 0 ? "flash-outline" : "barbell-outline"}
                                  size={15}
                                  color={palette.text.secondary}
                                />
                              </View>
                              <View style={styles.exercisePreviewCopy}>
                                <Text
                                  numberOfLines={1}
                                  style={[styles.exercisePreviewTitle, { color: palette.text.primary }]}
                                >
                                  {exercise.name}
                                </Text>
                                <Text
                                  numberOfLines={1}
                                  style={[styles.exercisePreviewMeta, { color: palette.text.secondary }]}
                                >
                                  {[exercise.sets, exercise.reps].filter(Boolean).join(" · ") ||
                                    exercise.day ||
                                    t("member.plan.coachGuided")}
                                </Text>
                              </View>
                            </View>
                          ))
                        ) : null}
                      </View>
                    ) : null}
                    <ZookButton testID="plan-start-today" onPress={() => openAssignment(nextWorkoutPlan.id)} icon="play-outline" fullWidth>
                      {t("member.plan.openTodayPlan")}
                    </ZookButton>
                  </Card>
                ) : !plansQuery.isLoading ? (
                  <Card variant="compact">
                    <EmptyState
                      icon="clipboard-outline"
                      title={t("member.plan.noPlanAssigned")}
                      body={t("member.plan.noPlanAssignedBody")}
                    />
                  </Card>
                ) : null}
              </AnimatedAppear>

              {upcomingPlans.length ? (
                <AnimatedAppear delay={80}>
                  <SectionHeader title={t("member.plan.morePlans")} />
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
                          title={planTitle(assignment, t("member.plan.assignedPlan"))}
                          subtitle={t("member.plan.percentComplete", {
                            percent: assignment.progress?.completionPct ?? 0,
                          })}
                          leading={<IconBubble icon="calendar-outline" tone="neutral" />}
                          trailing={<Ionicons name="chevron-forward" size={18} color={palette.text.tertiary} />}
                        />
                      </Card>
                    ))}
                  </View>
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
  inlinePreview: {
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 6,
    paddingTop: spacing.xs,
  },
  exercisePreviewCopy: { flex: 1, minWidth: 0 },
  exercisePreviewIcon: {
    alignItems: "center",
    borderRadius: 12,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  exercisePreviewMeta: {
    ...typography.small,
    lineHeight: 16,
  },
  exercisePreviewRow: {
    alignItems: "center",
    borderRadius: 14,
    flexDirection: "row",
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  exercisePreviewTitle: {
    ...typography.button,
    lineHeight: 18,
  },
  previewSkeleton: { gap: spacing.sm },
  todayCard: { gap: spacing.md },
  todayTop: { alignItems: "center", flexDirection: "row", gap: spacing.md },
  todayCopy: { flex: 1, gap: 4 },
  todayTitle: typography.headerTitle,
  todayMeta: typography.small,
});
