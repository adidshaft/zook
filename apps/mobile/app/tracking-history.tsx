import { Stack } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";

import { EmptyState, GlassCard, MobileHeader, QueryErrorState, ZookScreen } from "@/components/primitives";
import { WorkoutLogCard } from "@/components/tracking";
import { useMyTrackingWorkouts } from "@/lib/domains";
import { workoutToEntry } from "@/lib/tracking-view";
import { layout, spacing } from "@/lib/theme";

type TrackingWorkout = Parameters<typeof workoutToEntry>[0];

export default function TrackingHistoryScreen() {
  const workoutsQuery = useMyTrackingWorkouts();
  const workouts = (workoutsQuery.data?.workouts ?? []) as TrackingWorkout[];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="tracking-history-screen">
        <ScrollView contentInsetAdjustmentBehavior="never" showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <MobileHeader title="Workout history" subtitle="Completed training logs" showProfileShortcut={false} />
          {workoutsQuery.isError ? <QueryErrorState error={workoutsQuery.error} onRetry={() => void workoutsQuery.refetch()} /> : null}
          <View style={styles.stack}>
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
});
