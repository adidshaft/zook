import { Link, Stack } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { WorkoutLogEntry } from "@zook/core";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  MobileHeader,
  SectionHeader,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import {
  TrackingSummaryTile
} from "@/components/tracking";
import { useMyTracking } from "@/lib/query-hooks";
import { buildTrackingSummaryMetrics, workoutToEntry } from "@/lib/tracking-view";
import { colors, layout, spacing, typography } from "@/lib/theme";

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
  const weeklyCount = summary?.weeklyCount ?? 0;
  const totalDuration = summary?.totalDuration ?? 0;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ZookScreen>
        <ScrollView
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          <MobileHeader
            title="Tracking"
            subtitle="Workouts, progress, and goals"
          />

          {/* Weekly summary hero */}
          <GlassCard variant="success" contentStyle={styles.heroContent}>
            <View style={styles.heroTop}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>THIS WEEK</Text>
                <Text style={styles.heroValue}>{weeklyCount} Workout{weeklyCount !== 1 ? "s" : ""}</Text>
                <Text style={styles.heroBody}>
                  {totalDuration > 0
                    ? `${totalDuration} active minutes`
                    : "Start your fitness journey."}
                </Text>
              </View>
              <View style={styles.weekRing}>
                <Text style={styles.weekRingValue}>{weeklyCount}</Text>
                <Text style={styles.weekRingLabel}>/ 5</Text>
              </View>
            </View>
            <Link href="/tracking-history" asChild>
              <Pressable accessibilityRole="link" style={styles.viewAllLink}>
                <Text style={styles.viewAllText}>View all logs</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.lime} />
              </Pressable>
            </Link>
          </GlassCard>

          {/* Metrics grid */}
          <View style={styles.metricGrid}>
            {metrics.map((metric) => (
              <TrackingSummaryTile key={metric.id} metric={metric} />
            ))}
          </View>

          {/* Today's session */}
          <SectionHeader
            title="Today's Session"
            action={
              <Link href="/tracking-entry" asChild>
                <Pressable accessibilityRole="link" style={styles.logButton}>
                  <Ionicons name="add" size={18} color={colors.bg} />
                  <Text style={styles.logButtonText}>Log</Text>
                </Pressable>
              </Link>
            }
          />
          {trackingQuery.isLoading ? (
            <GlassCard variant="compact" contentStyle={styles.loadingContent}>
              <IconBubble icon="hourglass-outline" tone="amber" size={36} />
              <Text style={styles.loadingText}>Loading history...</Text>
            </GlassCard>
          ) : latestWorkout ? (
            <TodaySessionPreview entry={latestWorkout} />
          ) : (
            <GlassCard variant="compact" contentStyle={styles.emptyContent}>
              <IconBubble icon="barbell-outline" tone="neutral" size={42} />
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>No workouts yet</Text>
                <Text style={styles.emptyBody}>Log your first session to start tracking progress.</Text>
              </View>
              <ZookButton href="/tracking-entry" icon="add-outline">Log workout</ZookButton>
            </GlassCard>
          )}
        </ScrollView>
        <BottomNav />
      </ZookScreen>
    </>
  );
}

function TodaySessionPreview({ entry }: { entry: WorkoutLogEntry }) {
  const firstExercise = entry.exercises[0];

  return (
    <GlassCard variant="compact" contentStyle={styles.todayPreview}>
      <View style={styles.todayPreviewCopy}>
        <Text style={styles.todayDate}>{entry.dateLabel}</Text>
        <Text style={styles.todayTitle} numberOfLines={1}>
          {entry.workoutName}
        </Text>
        <Text style={styles.todayMeta} numberOfLines={1}>
          {firstExercise
            ? `${firstExercise.name} · ${firstExercise.setsLabel} · ${entry.durationLabel}`
            : `Focus: ${entry.focusLabel} · ${entry.durationLabel}`}
        </Text>
      </View>
      <View style={styles.todayStatusPill}>
        <Text style={styles.todayStatusText}>{entry.effortLabel}</Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  content: {
    width: "100%",
    maxWidth: layout.contentWidth,
    alignSelf: "center",
    paddingTop: 14,
    gap: 12,
    paddingBottom: layout.bottomNavContentPadding,
  },
  heroContent: {
    gap: spacing.md,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  heroCopy: {
    flex: 1,
    gap: 6,
  },
  heroEyebrow: {
    color: colors.lime,
    ...typography.eyebrow,
  },
  heroValue: {
    color: colors.text,
    ...typography.screenTitle,
  },
  heroBody: {
    color: colors.muted,
    ...typography.body,
  },
  weekRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: "rgba(185,244,85,0.4)",
    backgroundColor: "rgba(185,244,85,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  weekRingValue: {
    color: colors.lime,
    ...typography.headerTitle,
  },
  weekRingLabel: {
    color: colors.muted,
    ...typography.small,
  },
  viewAllLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    alignSelf: "flex-start",
  },
  viewAllText: {
    color: colors.lime,
    ...typography.caption,
  },
  metricGrid: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  logButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: colors.lime,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  logButtonText: {
    color: colors.bg,
    ...typography.caption,
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
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  emptyCopy: {
    alignItems: "center",
    gap: 4,
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
  todayPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  todayPreviewCopy: {
    flex: 1,
    gap: 3,
  },
  todayDate: {
    color: colors.muted,
    ...typography.caption,
  },
  todayTitle: {
    color: colors.text,
    ...typography.headerTitle,
  },
  todayMeta: {
    color: colors.amber,
    ...typography.caption,
  },
  todayStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(185,244,85,0.14)",
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.28)",
  },
  todayStatusText: {
    color: colors.lime,
    ...typography.caption,
  },
});
