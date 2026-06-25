import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { AnimatedAppear, EmptyState, Card, HeaderActions, QueryErrorState, ScreenHeader, SectionHeader, Skeleton, ZookButton, ZookScreen } from "@/components/primitives";
import { TrackingSummaryTile, WorkoutLogCard } from "@/components/tracking";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { HabitsPanel } from "@/features/member/progress/habits-panel";
import { useMyTracking, useMyTrackingWorkouts } from "@/lib/domains";
import { useT } from "@/lib/i18n";
import { useSharedValue } from "@/lib/reanimated-lite";
import { buildTrackingSummaryMetrics, workoutToEntry } from "@/lib/tracking-view";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

type TrackingWorkout = Parameters<typeof workoutToEntry>[0];

export default function ProgressScreen() {
  const { palette } = useTheme();
  const t = useT();
  const router = useRouter();
  const summaryQuery = useMyTracking();
  const workoutsQuery = useMyTrackingWorkouts();
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);
  const summary = summaryQuery.data?.summary;
  const latestBodyProgress = summaryQuery.data?.latestBodyProgress as { weightKg?: string | number | null } | null | undefined;
  const workouts = (workoutsQuery.data?.workouts ?? []) as TrackingWorkout[];
  const metrics = buildTrackingSummaryMetrics({
    totalDuration: summary?.totalDuration ?? 0,
    weeklyCount: summary?.weeklyCount ?? 0,
    recentCount: summary?.recentCount ?? 0,
    latestWeightKg: latestBodyProgress?.weightKg,
    habitsCount: summaryQuery.data?.habits?.length ?? 0,
  });
  const isLoading = summaryQuery.isLoading || workoutsQuery.isLoading;

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([summaryQuery.refetch(), workoutsQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <>
      <ZookScreen testID="progress-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          onScroll={(event) => {
            scrollY.value = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent.base} colors={[palette.accent.base]} />}
        >
          <ScreenHeader title={t("member.progress.title")} contextSlot={<RoleSwitcherContextPill />} trailing={<HeaderActions showBell />} scrollY={scrollY} />
          <AnimatedAppear delay={0}>
            <View style={styles.actions}>
              <ZookButton testID="tracking-log-workout" onPress={() => router.push("/tracking-entry" as never)} icon="add-circle-outline" style={styles.actionButton}>
                {t("member.progress.logWorkout")}
              </ZookButton>
              <ZookButton variant="secondary" onPress={() => router.push("/tracking-history" as never)} icon="time-outline" style={styles.actionButton}>
                {t("member.progress.history")}
              </ZookButton>
            </View>
          </AnimatedAppear>
          {summaryQuery.isError || workoutsQuery.isError ? (
            <QueryErrorState error={summaryQuery.error ?? workoutsQuery.error} onRetry={() => void onRefresh()} />
          ) : null}
          <AnimatedAppear delay={40}>
            <SectionHeader title={t("member.progress.thisWeek")} />
            {isLoading ? (
              <Card variant="compact" contentStyle={styles.loadingCard}>
                <Skeleton width="60%" height={18} borderRadius={9} />
                <Skeleton width="40%" height={14} borderRadius={7} />
                <Skeleton width="80%" height={14} borderRadius={7} />
              </Card>
            ) : (
              <View style={styles.metrics}>
                {metrics.map((metric) => (
                  <TrackingSummaryTile key={metric.id} metric={metric} />
                ))}
              </View>
            )}
          </AnimatedAppear>
          <AnimatedAppear delay={70}>
            <HabitsPanel />
          </AnimatedAppear>
          <AnimatedAppear delay={80}>
            <SectionHeader title={t("member.progress.recentWorkouts")} />
            <View style={styles.stack}>
              {workouts.slice(0, 3).map((workout, index) => (
                <WorkoutLogCard key={workout.id} entry={workoutToEntry(workout)} compact testID={index === 0 ? "tracking-history-workout-first" : undefined} />
              ))}
              {!workouts.length && !workoutsQuery.isLoading ? (
                <Card variant="compact">
                  <EmptyState
                    icon="barbell-outline"
                    title={t("member.progress.noWorkoutsLogged")}
                    body={t("member.progress.noWorkoutsLoggedBody")}
                  />
                </Card>
              ) : null}
            </View>
          </AnimatedAppear>
          <AnimatedAppear delay={120}>
            <Card variant="compact" contentStyle={styles.note}>
              <Ionicons name="shield-checkmark-outline" size={20} color={palette.accent.base} />
              <Text style={[styles.noteText, { color: palette.text.secondary }]}>
                {t("member.progress.privacyNote")}
              </Text>
            </Card>
          </AnimatedAppear>
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
  actions: { flexDirection: "row", gap: spacing.sm },
  actionButton: { flex: 1 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" },
  loadingCard: { gap: spacing.sm },
  stack: { gap: spacing.sm },
  note: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  noteText: { flex: 1, ...typography.small },
});
