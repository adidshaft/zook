import { Stack } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { TrackingWindow } from "@zook/core";
import { Card, PrimaryLink, Screen } from "@/components/primitives";
import {
  TrackingSectionHeader,
  WorkoutHistorySummary,
  WorkoutLogCard
} from "@/components/tracking";
import { useMyTrackingWorkouts } from "@/lib/query-hooks";
import { buildHistorySeries, workoutToEntry } from "@/lib/tracking-view";
import { colors, radii } from "@/lib/theme";

const windows: TrackingWindow[] = ["TODAY", "WEEKLY", "MONTHLY", "YEARLY"];

export default function TrackingHistory() {
  const [selectedWindow, setSelectedWindow] = useState<TrackingWindow>("WEEKLY");
  const workoutsQuery = useMyTrackingWorkouts();
  const workouts = (workoutsQuery.data?.workouts ?? []) as Array<{
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
  const series = useMemo(() => buildHistorySeries(workouts), [workouts, selectedWindow]);

  return (
    <>
      <Stack.Screen options={{ title: "Tracking history" }} />
      <Screen title="Tracking history">
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content}>
          <View style={styles.segmented}>
            {windows.map((windowKey) => {
              const active = windowKey === selectedWindow;
              return (
                <Pressable
                  key={windowKey}
                  onPress={() => setSelectedWindow(windowKey)}
                  style={[styles.segment, active ? styles.segmentActive : undefined]}
                >
                  <Text style={[styles.segmentText, active ? styles.segmentTextActive : undefined]} selectable>
                    {windowKey === "TODAY"
                      ? "Today"
                      : windowKey === "WEEKLY"
                        ? "Weekly"
                        : windowKey === "MONTHLY"
                          ? "Monthly"
                          : "Yearly"}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <WorkoutHistorySummary series={series} />

          <Card style={styles.callout}>
            <Text style={styles.calloutTitle} selectable>
              Keep it simple
            </Text>
            <Text style={styles.calloutBody} selectable>
              This MVP is intentionally focused on gym sessions only: when you worked out, how long you trained, and which exercises you finished.
            </Text>
            <PrimaryLink href="/tracking-entry">Add today's workout</PrimaryLink>
          </Card>

          <TrackingSectionHeader title="Logged sessions" />
          <View style={styles.logList}>
            {workoutsQuery.isLoading ? (
              <Card>
                <Text style={styles.calloutBody}>Loading workout history...</Text>
              </Card>
            ) : null}
            {series.entries.map((entry) => (
              <WorkoutLogCard key={entry.id} entry={entry} compact />
            ))}
          </View>
        </ScrollView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 20,
    gap: 16,
    paddingBottom: 40
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radii.pill,
    padding: 4,
    gap: 4
  },
  segment: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: 12,
    alignItems: "center"
  },
  segmentActive: {
    backgroundColor: colors.text
  },
  segmentText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "800"
  },
  segmentTextActive: {
    color: colors.bg
  },
  callout: {
    gap: 12
  },
  calloutTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "900"
  },
  calloutBody: {
    color: colors.muted,
    lineHeight: 20
  },
  logList: {
    gap: 14
  }
});
