import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState, GlassCard, MobileHeader, QueryErrorState, ZookScreen } from "@/components/primitives";
import { WorkoutLogCard } from "@/components/tracking";
import { useMyBodyProgress, useMyTrackingWorkouts } from "@/lib/domains";
import { workoutToEntry } from "@/lib/tracking-view";
import { layout, legacyColors, spacing, typography } from "@/lib/theme";

type TrackingWorkout = Parameters<typeof workoutToEntry>[0];

export default function TrackingHistoryScreen() {
  const workoutsQuery = useMyTrackingWorkouts();
  const bodyProgressQuery = useMyBodyProgress();
  const workouts = (workoutsQuery.data?.workouts ?? []) as TrackingWorkout[];
  const bodyEntries = bodyProgressQuery.data?.entries ?? [];
  const latest = bodyEntries[0];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="tracking-history-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Workout history" subtitle="Completed training logs" showProfileShortcut={false} />
          {workoutsQuery.isError ? <QueryErrorState error={workoutsQuery.error} onRetry={() => void workoutsQuery.refetch()} /> : null}
          {bodyProgressQuery.isError ? <QueryErrorState error={bodyProgressQuery.error} onRetry={() => void bodyProgressQuery.refetch()} /> : null}
          <View style={styles.stack}>
            <GlassCard variant="compact" contentStyle={styles.bodyCard}>
              <Text style={styles.cardTitle}>Body progress</Text>
              {latest ? (
                <>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Weight</Text>
                    <Text style={styles.metricValue}>{latest.weightKg ?? "-"} kg</Text>
                  </View>
                  <View style={styles.metricRow}>
                    <Text style={styles.metricLabel}>Waist</Text>
                    <Text style={styles.metricValue}>{latest.waistCm ?? "-"} cm</Text>
                  </View>
                  <View style={styles.trendRail}>
                    {bodyEntries.slice(0, 8).reverse().map((entry) => {
                      const weight = Number(entry.weightKg ?? 0);
                      const height = Math.max(10, Math.min(72, weight));
                      return <View key={entry.id} style={[styles.trendBar, { height }]} />;
                    })}
                  </View>
                </>
              ) : (
                <EmptyState title="No body measurements" body="Weight and waist trends will appear after your first body log." />
              )}
            </GlassCard>
            {workouts.map((workout, index) => (
              <WorkoutLogCard key={workout.id} entry={workoutToEntry(workout)} testID={index === 0 ? "tracking-history-workout-first" : undefined} />
            ))}
            {!workouts.length && !workoutsQuery.isLoading ? (
              <GlassCard variant="compact">
                <EmptyState title="No workouts yet" body="Saved workouts will show here." />
              </GlassCard>
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
  cardTitle: { color: legacyColors.text, ...typography.cardTitle },
  metricRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  metricLabel: { color: legacyColors.muted, ...typography.caption },
  metricValue: { color: legacyColors.text, ...typography.bodyStrong },
  trendRail: { alignItems: "flex-end", flexDirection: "row", gap: 6, minHeight: 78 },
  trendBar: { backgroundColor: legacyColors.lime, borderRadius: 4, flex: 1, minHeight: 10 },
});
