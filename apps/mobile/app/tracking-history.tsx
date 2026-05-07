import { Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import type { TrackingWindow } from "@zook/core";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  MobileHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { TrackingHistorySkeleton } from "@/components/skeletons";
import {
  TrackingSectionHeader,
  WorkoutHistorySummary,
  WorkoutLogCard,
} from "@/components/tracking";
import { useMyTrackingWorkouts } from "@/lib/query-hooks";
import { buildHistorySeries } from "@/lib/tracking-view";
import { colors, layout, spacing, typography, radii } from "@/lib/theme";

const windows: TrackingWindow[] = ["TODAY", "WEEKLY", "MONTHLY", "YEARLY"];
const windowLabels: Record<TrackingWindow, string> = {
  TODAY: "Today",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
};

export default function TrackingHistory() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedWindow, setSelectedWindow] = useState<TrackingWindow>("WEEKLY");
  const [refreshing, setRefreshing] = useState(false);
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
  const series = useMemo(
    () => buildHistorySeries(workouts, selectedWindow),
    [workouts, selectedWindow],
  );

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await queryClient.invalidateQueries({ queryKey: ["me", "tracking", "workouts"] });
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.lime}
              colors={[colors.lime]}
            />
          }
        >
          <MobileHeader
            title="History"
            subtitle={`${series.entries.length} session${series.entries.length !== 1 ? "s" : ""} logged`}
            leading={
              <Pressable
                onPress={() => router.canGoBack() ? router.back() : router.replace("/")}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={styles.iconButton}
              >
                <Ionicons name="chevron-back" size={21} color={colors.text} />
              </Pressable>
            }
            showProfileShortcut={false}
          />

          {/* Window selector */}
          <View style={styles.segmented}>
            {windows.map((windowKey) => {
              const active = windowKey === selectedWindow;
              return (
                <Pressable
                  key={windowKey}
                  onPress={() => setSelectedWindow(windowKey)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                  style={[styles.segment, active ? styles.segmentActive : null]}
                >
                  <Text style={[styles.segmentText, active ? styles.segmentTextActive : null]}>
                    {windowLabels[windowKey]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <WorkoutHistorySummary series={series} />

          <GlassCard variant="compact" contentStyle={styles.calloutContent}>
            <IconBubble icon="analytics-outline" tone="blue" size={36} />
            <View style={styles.calloutCopy}>
              <Text style={styles.calloutTitle}>Track your progress</Text>
              <Text style={styles.calloutBody}>Log when, how long, and what exercises you completed.</Text>
            </View>
            <ZookButton href="/tracking-entry" icon="add-outline">Log workout</ZookButton>
          </GlassCard>

          <TrackingSectionHeader title="Logged sessions" />
          <View style={styles.logList}>
            {workoutsQuery.isLoading ? (
              <TrackingHistorySkeleton />
            ) : null}
            {!workoutsQuery.isLoading && series.entries.length === 0 ? (
              <GlassCard variant="compact" contentStyle={styles.emptyContent}>
                <IconBubble icon="barbell-outline" tone="neutral" size={42} />
                <Text style={styles.emptyTitle}>No workouts in this period</Text>
                <Text style={styles.emptyBody}>Try a wider time range or log your first session.</Text>
              </GlassCard>
            ) : null}
            {series.entries.map((entry) => (
              <WorkoutLogCard key={entry.id} entry={entry} compact />
            ))}
          </View>
        </ScrollView>
        <BottomNav />
      </ZookScreen>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 14,
    paddingBottom: layout.bottomNavContentPadding,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.panel,
    alignItems: "center",
    justifyContent: "center",
  },
  segmented: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: radii.pill,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    borderRadius: radii.pill,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: colors.text,
  },
  segmentText: {
    color: colors.muted,
    ...typography.caption,
  },
  segmentTextActive: {
    color: colors.bg,
  },
  calloutContent: {
    gap: spacing.md,
  },
  calloutCopy: {
    gap: 4,
  },
  calloutTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  calloutBody: {
    color: colors.muted,
    ...typography.body,
  },
  logList: {
    gap: 10,
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingText: {
    color: colors.muted,
    ...typography.body,
  },
  emptyContent: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  emptyBody: {
    color: colors.muted,
    ...typography.body,
    textAlign: "center",
  },
});
