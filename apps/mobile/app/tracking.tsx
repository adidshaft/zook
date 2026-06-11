import { Ionicons } from "@expo/vector-icons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import { EmptyState, Card, IconBubble, MobileHeader, QueryErrorState, SectionHeader, ZookButton, ZookScreen } from "@/components/primitives";
import { TrackingSummaryTile, WorkoutLogCard } from "@/components/tracking";
import { useMyTracking, useMyTrackingWorkouts } from "@/lib/domains";
import { buildTrackingSummaryMetrics, workoutToEntry } from "@/lib/tracking-view";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

type TrackingWorkout = Parameters<typeof workoutToEntry>[0];

export default function TrackingScreen() {
  const { palette } = useTheme();
  const router = useRouter();
  const summaryQuery = useMyTracking();
  const workoutsQuery = useMyTrackingWorkouts();
  const [refreshing, setRefreshing] = useState(false);
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
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen testID="tracking-screen">
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.accent.base} colors={[palette.accent.base]} />}
        >
          <MobileHeader title="Tracking" subtitle="Workouts, body progress, and habits" showProfileShortcut={false} />
          <View style={styles.actions}>
            <ZookButton testID="tracking-log-workout" onPress={() => router.push("/tracking-entry" as never)} icon="add-circle-outline" style={styles.actionButton}>
              Log workout
            </ZookButton>
            <ZookButton variant="secondary" onPress={() => router.push("/tracking-history" as never)} icon="time-outline" style={styles.actionButton}>
              History
            </ZookButton>
          </View>
          {summaryQuery.isError || workoutsQuery.isError ? (
            <QueryErrorState error={summaryQuery.error ?? workoutsQuery.error} onRetry={() => void onRefresh()} />
          ) : null}
          <SectionHeader title="This week" />
          <View style={styles.metrics}>
            {metrics.map((metric) => (
              <TrackingSummaryTile key={metric.id} metric={metric} />
            ))}
          </View>
          <SectionHeader title="Recent workouts" />
          <View style={styles.stack}>
            {workouts.slice(0, 3).map((workout, index) => (
              <WorkoutLogCard key={workout.id} entry={workoutToEntry(workout)} compact testID={index === 0 ? "tracking-history-workout-first" : undefined} />
            ))}
            {!workouts.length && !workoutsQuery.isLoading ? (
              <Card variant="compact" contentStyle={styles.emptyCard}>
                <IconBubble icon="barbell-outline" tone="lime" />
                <EmptyState title="No workouts logged" body="Log your first session after training." />
              </Card>
            ) : null}
          </View>
          <Card variant="compact" contentStyle={styles.note}>
            <Ionicons name="shield-checkmark-outline" size={20} color={palette.accent.base} />
            <Text style={[styles.noteText, { color: palette.text.secondary }]}>Private entries stay with you unless you choose trainer visibility.</Text>
          </Card>
        </ScrollView>
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: { alignSelf: "center", gap: spacing.md, maxWidth: layout.contentWidth, paddingBottom: layout.bottomNavContentPadding, paddingTop: 14, width: "100%" },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionButton: { flex: 1 },
  metrics: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "space-between" },
  stack: { gap: spacing.sm },
  emptyCard: { alignItems: "center", gap: spacing.sm },
  note: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  noteText: { flex: 1, ...typography.small },
});
