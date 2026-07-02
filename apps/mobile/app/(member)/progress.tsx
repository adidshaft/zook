import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  AnimatedAppear,
  EmptyState,
  Card,
  HeaderActions,
  QueryErrorState,
  ScreenHeader,
  SectionHeader,
  Skeleton,
  TrendSparkline,
  type TrendSparklinePoint,
  ZookScreen,
} from "@/components/primitives";
import { TrackingSummaryTile, WorkoutLogCard } from "@/components/tracking";
import { RoleSwitcherContextPill } from "@/components/role-switcher";
import { HabitsPanel } from "@/features/member/progress/habits-panel";
import { useMyBodyProgress, useMyTracking, useMyTrackingWorkouts, type BodyProgressEntryRecord } from "@/lib/domains";
import { useT } from "@/lib/i18n";
import { useSharedValue } from "@/lib/reanimated-lite";
import { buildTrackingSummaryMetrics, workoutToEntry } from "@/lib/tracking-view";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

type TrackingWorkout = Parameters<typeof workoutToEntry>[0];

function bodyWeightTrend(entries: BodyProgressEntryRecord[]): TrendSparklinePoint[] {
  return entries
    .map((entry): TrendSparklinePoint | null => {
      const value = typeof entry.weightKg === "number" ? entry.weightKg : Number(entry.weightKg);
      if (!Number.isFinite(value) || !entry.measuredAt) {
        return null;
      }
      return { date: entry.measuredAt, value };
    })
    .filter((point): point is TrendSparklinePoint => point !== null);
}

export default function ProgressScreen() {
  const { palette } = useTheme();
  const t = useT();
  const router = useRouter();
  const summaryQuery = useMyTracking();
  const bodyProgressQuery = useMyBodyProgress();
  const workoutsQuery = useMyTrackingWorkouts();
  const [refreshing, setRefreshing] = useState(false);
  const scrollY = useSharedValue(0);
  const summary = summaryQuery.data?.summary;
  const latestBodyProgress = summaryQuery.data?.latestBodyProgress as { weightKg?: string | number | null } | null | undefined;
  const workouts = (workoutsQuery.data?.workouts ?? []) as TrackingWorkout[];
  const bodyEntries = bodyProgressQuery.data?.entries ?? [];
  const metrics = buildTrackingSummaryMetrics({
    totalDuration: summary?.totalDuration ?? 0,
    weeklyCount: summary?.weeklyCount ?? 0,
    recentCount: summary?.recentCount ?? 0,
    latestWeightKg: latestBodyProgress?.weightKg,
    habitsCount: summaryQuery.data?.habits?.length ?? 0,
    t,
  });
  const isLoading = summaryQuery.isLoading || bodyProgressQuery.isLoading || workoutsQuery.isLoading;

  async function onRefresh() {
    setRefreshing(true);
    try {
      await Promise.all([summaryQuery.refetch(), bodyProgressQuery.refetch(), workoutsQuery.refetch()]);
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
          <ScreenHeader title={t("member.progress.title")} contextSlot={<RoleSwitcherContextPill />} trailing={<HeaderActions showBell showProfileShortcut={false} />} scrollY={scrollY} />
          {summaryQuery.isError || workoutsQuery.isError || bodyProgressQuery.isError ? (
            <QueryErrorState error={summaryQuery.error ?? workoutsQuery.error ?? bodyProgressQuery.error} onRetry={() => void onRefresh()} />
          ) : null}
          <AnimatedAppear delay={40}>
            <SectionHeader
              title={t("member.progress.thisWeek")}
              action={
                <Pressable
                  testID="tracking-log-workout"
                  accessibilityRole="button"
                  accessibilityLabel={t("member.progress.logWorkout")}
                  onPress={() => router.push("/tracking-entry" as never)}
                  style={({ pressed }) => [
                    styles.headerIconButton,
                    {
                      borderColor: palette.accent.soft,
                      backgroundColor: palette.surface.accentSoft,
                    },
                    pressed ? styles.iconButtonPressed : null,
                  ]}
                >
                  <Ionicons name="add-circle-outline" size={18} color={palette.accent.base} />
                </Pressable>
              }
            />
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
          {!isLoading ? (
            <AnimatedAppear delay={55}>
              <TrendSparkline
                label={t("tracking.weight")}
                labels={{
                  min: t("tracking.trend.min"),
                  max: t("tracking.trend.max"),
                  latest: t("tracking.trend.latest"),
                }}
                points={bodyWeightTrend(bodyEntries)}
                unit="kg"
              />
            </AnimatedAppear>
          ) : null}
          <AnimatedAppear delay={70}>
            <HabitsPanel />
          </AnimatedAppear>
          <AnimatedAppear delay={80}>
            <SectionHeader
              title={t("member.progress.recentWorkouts")}
              action={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("member.progress.history")}
                  onPress={() => router.push("/tracking-history" as never)}
                  style={({ pressed }) => [
                    styles.headerIconButton,
                    {
                      borderColor: palette.border.default,
                      backgroundColor: palette.surface.raised,
                    },
                    pressed ? styles.iconButtonPressed : null,
                  ]}
                >
                  <Ionicons name="time-outline" size={18} color={palette.text.secondary} />
                </Pressable>
              }
            />
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
  headerIconButton: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  iconButtonPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.98 }],
  },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" },
  loadingCard: { gap: spacing.sm },
  stack: { gap: spacing.sm },
  note: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  noteText: { flex: 1, ...typography.small },
});
