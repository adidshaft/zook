import { Stack } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Card, Dock, PrimaryLink, Screen } from "@/components/primitives";
import {
  TrackingSectionHeader,
  TrackingSummaryTile,
  WorkoutLogCard
} from "@/components/tracking";
import { useMyTracking } from "@/lib/query-hooks";
import { buildTrackingSummaryMetrics, workoutToEntry } from "@/lib/tracking-view";
import { colors } from "@/lib/theme";

export default function TrackingDashboard() {
  const trackingQuery = useMyTracking();
  const summary = trackingQuery.data?.summary;
  const recentWorkouts = (trackingQuery.data?.recentWorkouts ?? []) as Array<{
    id: string;
    title: string;
    workoutType: string;
    startedAt: string;
    endedAt?: string | null;
    durationMinutes?: number | null;
    intensity?: string | null;
    notes?: string | null;
    exercises?: Array<{
      id: string;
      exerciseName: string;
      setsCompleted?: number | null;
      reps?: number | null;
      weightKg?: string | number | null;
      completed: boolean;
    }>;
  }>;
  const latestWeight = (trackingQuery.data?.latestBodyProgress as { weightKg?: string | number | null } | null)?.weightKg;
  const habits = trackingQuery.data?.habits ?? [];
  const metrics = buildTrackingSummaryMetrics({
    totalDuration: summary?.totalDuration ?? 0,
    weeklyCount: summary?.weeklyCount ?? 0,
    recentCount: summary?.recentCount ?? 0,
    latestWeightKg: latestWeight,
    habitsCount: habits.length
  });
  const latestWorkout = recentWorkouts[0] ? workoutToEntry(recentWorkouts[0]) : null;

  return (
    <>
      <Stack.Screen options={{ title: "Tracking" }} />
      <Screen title="Tracking">
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <View style={styles.heroHeader}>
            <Text style={styles.headline}>
              Your training.
            </Text>
            <Text style={styles.subheadline}>
              Sessions, exercises, and progress — all in one place.
            </Text>
          </View>

          <View style={styles.metricGrid}>
            {metrics.map((metric) => (
              <TrackingSummaryTile key={metric.id} metric={metric} />
            ))}
          </View>

          <TrackingSectionHeader title="Today's workout" href="/tracking-entry" linkLabel="Add exercises" />
          {trackingQuery.isLoading ? (
            <Card>
              <Text style={styles.subheadline}>Loading workout history...</Text>
            </Card>
          ) : latestWorkout ? (
            <WorkoutLogCard entry={latestWorkout} />
          ) : (
            <Card>
              <Text style={styles.subheadline}>No workouts logged yet. Add your first session after training.</Text>
            </Card>
          )}

          <Card style={styles.weekCard}>
            <Text style={styles.weekEyebrow}>
              Weekly summary
            </Text>
            <Text style={styles.weekValue}>
              {summary ? `${summary.weeklyCount} sessions` : "0 sessions"}
            </Text>
            <Text style={styles.weekBody}>
              {summary ? `${summary.totalDuration} minutes logged` : "Start logging workouts and habits."}
            </Text>
            <PrimaryLink href="/tracking-history">View history</PrimaryLink>
          </Card>

          <TrackingSectionHeader title="Recent logs" href="/tracking-history" />
          <View style={styles.logList}>
            {recentWorkouts.slice(0, 3).map((workout) => (
              <WorkoutLogCard key={workout.id} entry={workoutToEntry(workout)} compact />
            ))}
          </View>

        </ScrollView>
        <Dock />
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 120
  },
  heroHeader: {
    gap: 8
  },
  headline: {
    color: colors.text,
    fontSize: 36,
    fontWeight: "900",
    lineHeight: 40
  },
  subheadline: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22
  },
  metricGrid: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap"
  },
  weekCard: {
    gap: 10
  },
  weekEyebrow: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: "800"
  },
  weekValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: "900"
  },
  weekBody: {
    color: colors.muted,
    lineHeight: 20
  },
  logList: {
    gap: 14
  }
});
