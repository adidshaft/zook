import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  EmptyState,
  Card,
  AppHeader,
  Skeleton,
  QueryErrorState,
  ZookScreen,
} from "@/components/primitives";
import { WorkoutLogCard } from "@/components/tracking";
import { useMyBodyProgress, useMyTrackingWorkouts } from "@/lib/domains";
import { workoutToEntry } from "@/lib/tracking-view";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

type TrackingWorkout = Parameters<typeof workoutToEntry>[0];

export default function TrackingHistoryScreen() {
  const { palette } = useTheme();
  const workoutsQuery = useMyTrackingWorkouts();
  const bodyProgressQuery = useMyBodyProgress();
  const workouts = (workoutsQuery.data?.workouts ?? []) as TrackingWorkout[];
  const bodyEntries = bodyProgressQuery.data?.entries ?? [];
  const latest = bodyEntries[0];
  const chartEntries = bodyEntries
    .slice(0, 8)
    .reverse()
    .map((entry) => ({ id: entry.id, weight: Number(entry.weightKg ?? 0) }))
    .filter((entry) => Number.isFinite(entry.weight) && entry.weight > 0);
  const minWeight = chartEntries.length ? Math.min(...chartEntries.map((entry) => entry.weight)) : 0;
  const maxWeight = chartEntries.length ? Math.max(...chartEntries.map((entry) => entry.weight)) : 0;
  const weightRange = Math.max(maxWeight - minWeight, 1);

  return (
    <>
      <ZookScreen testID="tracking-history-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={workoutsQuery.isRefetching || bodyProgressQuery.isRefetching}
              onRefresh={() => {
                void workoutsQuery.refetch();
                void bodyProgressQuery.refetch();
              }}
              tintColor={palette.accent.base}
              colors={[palette.accent.base]}
            />
          }
        >
          <AppHeader title="Workout history" showProfileShortcut={false} showBack />
          {workoutsQuery.isError ? <QueryErrorState error={workoutsQuery.error} onRetry={() => void workoutsQuery.refetch()} /> : null}
          {bodyProgressQuery.isError ? <QueryErrorState error={bodyProgressQuery.error} onRetry={() => void bodyProgressQuery.refetch()} /> : null}
          <View style={styles.stack}>
            {workoutsQuery.isLoading || bodyProgressQuery.isLoading ? (
              <Card variant="compact" contentStyle={styles.loadingCard}>
                <Skeleton height={18} width="44%" />
                <Skeleton height={44} />
                <Skeleton height={44} />
                <Skeleton height={84} />
              </Card>
            ) : null}
            {!workoutsQuery.isLoading && !bodyProgressQuery.isLoading ? (
              <Card variant="compact" contentStyle={styles.bodyCard}>
                <Text style={[styles.cardTitle, { color: palette.text.primary }]}>Body progress</Text>
                {latest ? (
                  <>
                    <View style={styles.metricRow}>
                      <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>Weight</Text>
                      <Text style={[styles.metricValue, { color: palette.text.primary }]}>
                        {latest.weightKg ?? "-"} kg
                      </Text>
                    </View>
                    <View style={styles.metricRow}>
                      <Text style={[styles.metricLabel, { color: palette.text.secondary }]}>Waist</Text>
                      <Text style={[styles.metricValue, { color: palette.text.primary }]}>
                        {latest.waistCm ?? "-"} cm
                      </Text>
                    </View>
                    <View style={styles.trendRail}>
                      {chartEntries.map((entry) => {
                        const normalized = (entry.weight - minWeight) / weightRange;
                        const height = 14 + normalized * 58;
                        return (
                          <View
                            key={entry.id}
                            style={[styles.trendBar, { height, backgroundColor: palette.accent.base }]}
                          />
                        );
                      })}
                    </View>
                  </>
                ) : (
                  <EmptyState title="No body measurements" body="Add a body log to start weight and waist trends." />
                )}
              </Card>
            ) : null}
            {workouts.map((workout, index) => (
              <WorkoutLogCard key={workout.id} entry={workoutToEntry(workout)} testID={index === 0 ? "tracking-history-workout-first" : undefined} />
            ))}
            {!workouts.length && !workoutsQuery.isLoading ? (
              <Card variant="compact">
                <EmptyState title="No workouts" />
              </Card>
            ) : null}
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
    paddingTop: layout.screenContentTopPadding,
    width: "100%",
  },
  stack: { gap: spacing.md },
  bodyCard: { gap: 10 },
  cardTitle: typography.cardTitle,
  loadingCard: { gap: spacing.sm },
  metricRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  metricLabel: typography.caption,
  metricValue: typography.bodyStrong,
  trendRail: { alignItems: "flex-end", flexDirection: "row", gap: 6, minHeight: 78 },
  trendBar: { borderRadius: 4, flex: 1, minHeight: 10 },
});
