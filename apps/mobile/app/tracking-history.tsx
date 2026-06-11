import { ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState, Card, MobileHeader, QueryErrorState, ZookScreen } from "@/components/primitives";
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

  return (
    <>
      <ZookScreen testID="tracking-history-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Workout history" subtitle="Completed training logs" showProfileShortcut={false} />
          {workoutsQuery.isError ? <QueryErrorState error={workoutsQuery.error} onRetry={() => void workoutsQuery.refetch()} /> : null}
          {bodyProgressQuery.isError ? <QueryErrorState error={bodyProgressQuery.error} onRetry={() => void bodyProgressQuery.refetch()} /> : null}
          <View style={styles.stack}>
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
                    {bodyEntries.slice(0, 8).reverse().map((entry) => {
                      const weight = Number(entry.weightKg ?? 0);
                      const height = Math.max(10, Math.min(72, weight));
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
                <EmptyState title="No body measurements" body="Weight and waist trends will appear after your first body log." />
              )}
            </Card>
            {workouts.map((workout, index) => (
              <WorkoutLogCard key={workout.id} entry={workoutToEntry(workout)} testID={index === 0 ? "tracking-history-workout-first" : undefined} />
            ))}
            {!workouts.length && !workoutsQuery.isLoading ? (
              <Card variant="compact">
                <EmptyState title="No workouts yet" body="Saved workouts will show here." />
              </Card>
            ) : null}
          </View>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: 14, width: "100%" },
  stack: { gap: spacing.md },
  bodyCard: { gap: 10 },
  cardTitle: typography.cardTitle,
  metricRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  metricLabel: typography.caption,
  metricValue: typography.bodyStrong,
  trendRail: { alignItems: "flex-end", flexDirection: "row", gap: 6, minHeight: 78 },
  trendBar: { borderRadius: 4, flex: 1, minHeight: 10 },
});
