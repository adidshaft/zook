import { Link, Stack, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { WorkoutLogEntry } from "@zook/core";
import {
  BottomNav,
  GlassCard,
  IconBubble,
  MobileHeader,
  SectionHeader,
  Skeleton,
  StickyActionBar,
  ZookButton,
  ZookScreen,
} from "@/components/primitives";
import { TrackingSummaryTile } from "@/components/tracking";
import { toWebUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatShortDate } from "@/lib/formatting";
import { useI18n } from "@/lib/i18n";
import { useMyBodyProgress, useMyTracking, type BodyProgressEntryRecord } from "@/lib/query-hooks";
import { buildTrackingSummaryMetrics, workoutToEntry } from "@/lib/tracking-view";
import { colors, layout, spacing, typography } from "@/lib/theme";

export default function TrackingDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const trackingQuery = useMyTracking();
  const bodyProgressQuery = useMyBodyProgress();
  const [refreshing, setRefreshing] = useState(false);
  const { token } = useAuth();
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
  const latestWeight = (
    trackingQuery.data?.latestBodyProgress as { weightKg?: string | number | null } | null
  )?.weightKg;
  const latestBodyProgress = trackingQuery.data?.latestBodyProgress as {
    weightKg?: string | number | null;
    bodyFatPct?: string | number | null;
    bodyFatPercent?: string | number | null;
    measuredAt?: string | null;
    notes?: string | null;
  } | null;
  const habits = (trackingQuery.data?.habits ?? []) as Array<{
    id?: string;
    name?: string | null;
    title?: string | null;
    cadence?: string | null;
    streakCount?: number | null;
    targetCount?: number | null;
    completedCount?: number | null;
  }>;
  const metrics = buildTrackingSummaryMetrics({
    totalDuration: summary?.totalDuration ?? 0,
    weeklyCount: summary?.weeklyCount ?? 0,
    recentCount: summary?.recentCount ?? 0,
    latestWeightKg: latestWeight,
    habitsCount: habits.length,
  });
  const latestWorkout = recentWorkouts[0] ? workoutToEntry(recentWorkouts[0]) : null;
  const bodyProgressEntries = bodyProgressQuery.data?.entries ?? [];
  const weeklyCount = summary?.weeklyCount ?? 0;
  const weeklyGoal = 5;
  const totalDuration = summary?.totalDuration ?? 0;
  const currentStreak = computeWorkoutStreak(recentWorkouts);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me", "tracking", "summary"] }),
        queryClient.invalidateQueries({ queryKey: ["me", "tracking", "body-progress"] }),
      ]);
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
            title="Tracking"
            subtitle="Workouts, progress, and goals"
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

          {/* Weekly summary hero */}
          <GlassCard variant="success" contentStyle={styles.heroContent}>
            <View style={styles.heroTop}>
              <View style={styles.heroCopy}>
                <Text style={styles.heroEyebrow}>THIS WEEK</Text>
                <Text style={styles.heroValue}>
                  {weeklyCount} Workout{weeklyCount !== 1 ? "s" : ""}
                </Text>
                <Text style={styles.heroBody}>
                  {totalDuration > 0
                    ? `${totalDuration} active minutes`
                    : "Start your fitness journey."}
                </Text>
              </View>
              <View style={styles.weekRing}>
                <Text style={styles.weekRingValue}>{weeklyCount}</Text>
                <Text style={styles.weekRingLabel}>/ {weeklyGoal}</Text>
              </View>
            </View>
            <View style={styles.streakIndicator}>
              <Ionicons name="flame-outline" size={18} color={colors.amber} />
              <Text style={styles.streakText}>{currentStreak} day streak</Text>
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

          {(latestBodyProgress || habits.length) && !trackingQuery.isLoading ? (
            <View style={styles.progressGrid}>
              {latestBodyProgress ? <BodyProgressCard progress={latestBodyProgress} /> : null}
              {habits.length ? <HabitProgressCard habits={habits} /> : null}
            </View>
          ) : null}

          {!habits.length && !trackingQuery.isLoading ? (
            <GlassCard variant="compact" contentStyle={styles.habitPromptContent}>
              <IconBubble icon="flash-outline" tone="neutral" size={38} />
              <View style={styles.habitPromptCopy}>
                <Text style={styles.habitPromptTitle}>Build a habit</Text>
                <Text numberOfLines={1} style={styles.habitPromptBody}>
                  Sleep, water, steps. Log them daily.
                </Text>
              </View>
              <ZookButton href="/tracking-entry" tone="secondary" size="sm">
                Add
              </ZookButton>
            </GlassCard>
          ) : null}

          {bodyProgressEntries.length ? (
            <BodyProgressTimeline entries={bodyProgressEntries} token={token} />
          ) : null}

          {/* Today's session */}
          <SectionHeader title="Last workout" />
          {trackingQuery.isLoading ? (
            <GlassCard variant="compact" contentStyle={styles.loadingContent}>
              <Skeleton width={36} height={36} borderRadius={18} />
              <View style={styles.loadingSkeletonCopy}>
                <Skeleton width="58%" height={16} borderRadius={8} />
                <Skeleton width="38%" height={12} borderRadius={6} />
              </View>
            </GlassCard>
          ) : latestWorkout ? (
            <TodaySessionPreview entry={latestWorkout} />
          ) : (
            <GlassCard variant="compact" contentStyle={styles.emptyContent}>
              <IconBubble icon="barbell-outline" tone="neutral" size={42} />
              <View style={styles.emptyCopy}>
                <Text style={styles.emptyTitle}>No workouts yet</Text>
                <Text style={styles.emptyBody}>
                  Log your first session to start tracking progress.
                </Text>
              </View>
            </GlassCard>
          )}
        </ScrollView>
        <StickyActionBar bottomOffset={layout.bottomNavHeight + 22}>
          <ZookButton href="/tracking-entry" icon="add-outline" fullWidth>
            Log workout
          </ZookButton>
        </StickyActionBar>
        <BottomNav selectedPath="/more" />
      </ZookScreen>
    </>
  );
}

function computeWorkoutStreak(
  workouts: Array<{ startedAt: string }>,
) {
  const days = new Set(
    workouts
      .map((workout) => new Date(workout.startedAt))
      .filter((date) => Number.isFinite(date.getTime()))
      .map((date) => date.toISOString().slice(0, 10)),
  );
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  let streak = 0;
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function TodaySessionPreview({ entry }: { entry: WorkoutLogEntry }) {
  const firstExercise = entry.exercises[0];
  const completedExercises = entry.exercises.filter(
    (exercise) => exercise.status === "DONE",
  ).length;

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
        <Text style={styles.todayDetail}>
          {entry.exercises.length
            ? `${completedExercises}/${entry.exercises.length} exercises completed`
            : "Workout details are ready when exercises are logged."}
        </Text>
      </View>
      <View style={styles.todayStatusPill}>
        <Text style={styles.todayStatusText}>{entry.effortLabel}</Text>
      </View>
    </GlassCard>
  );
}

function BodyProgressCard({
  progress,
}: {
  progress: {
    weightKg?: string | number | null;
    bodyFatPct?: string | number | null;
    bodyFatPercent?: string | number | null;
    measuredAt?: string | null;
    notes?: string | null;
  };
}) {
  const { t } = useI18n();
  const bodyFat = progress.bodyFatPct ?? progress.bodyFatPercent;
  return (
    <GlassCard variant="compact" style={styles.progressCardFrame} contentStyle={styles.progressCard}>
      <View style={styles.progressCardHeader}>
        <IconBubble icon="body-outline" tone="blue" size={34} />
        <View style={styles.progressCardCopy}>
          <Text style={styles.progressCardTitle}>{t("tracking.bodyComposition")}</Text>
          <Text style={styles.progressCardSubtitle}>
            {progress.measuredAt
              ? new Date(progress.measuredAt).toLocaleDateString()
              : t("tracking.latestEntry")}
          </Text>
        </View>
      </View>
      <View style={styles.readoutRow}>
        <View style={styles.readoutBlock}>
          <Text style={styles.readoutValue}>
            {progress.weightKg ? `${progress.weightKg} kg` : "--"}
          </Text>
          <Text style={styles.readoutLabel}>{t("tracking.weight")}</Text>
        </View>
        <View style={styles.readoutBlock}>
          <Text style={styles.readoutValue}>{bodyFat ? `${bodyFat}%` : "--"}</Text>
          <Text style={styles.readoutLabel}>{t("tracking.bodyFat")}</Text>
        </View>
      </View>
      {progress.notes ? (
        <Text numberOfLines={2} style={styles.progressNote}>
          {progress.notes}
        </Text>
      ) : null}
    </GlassCard>
  );
}

function BodyProgressTimeline({
  entries,
  token,
}: {
  entries: BodyProgressEntryRecord[];
  token?: string | null;
}) {
  const { t } = useI18n();
  const visibleEntries = entries.slice(0, 8);

  return (
    <View style={styles.timelineSection}>
      <SectionHeader
        title={t("tracking.bodyTimeline")}
        subtitle={t("tracking.bodyTimelineSubtitle", { count: entries.length })}
      />
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photoTimeline}
      >
        {visibleEntries.map((entry) => {
          const photoUrl = normalizeProgressPhotoUrl(entry);
          const bodyFat = entry.bodyFatPercent ?? entry.bodyFatPct;
          return (
            <GlassCard
              key={entry.id}
              variant="compact"
              style={styles.photoTimelineCard}
              contentStyle={styles.photoTimelineCardContent}
            >
              <View style={styles.photoFrame}>
                {photoUrl ? (
                  <Image
                    source={{
                      uri: photoUrl,
                      ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
                    }}
                    style={styles.photoImage}
                    contentFit="cover"
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons name="image-outline" size={24} color={colors.subtle} />
                    <Text style={styles.photoPlaceholderText}>{t("tracking.noPhoto")}</Text>
                  </View>
                )}
              </View>
              <View style={styles.photoTimelineCopy}>
                <Text style={styles.photoTimelineDate}>{formatShortDate(entry.measuredAt)}</Text>
                <Text numberOfLines={1} style={styles.photoTimelineTitle}>
                  {photoUrl ? t("tracking.photoLogged") : t("tracking.bodyComposition")}
                </Text>
                <Text numberOfLines={1} style={styles.photoTimelineMeta}>
                  {entry.weightKg ? `${t("tracking.weight")} ${entry.weightKg} kg` : "--"}
                  {bodyFat ? ` · ${t("tracking.bodyFat")} ${bodyFat}%` : ""}
                </Text>
              </View>
            </GlassCard>
          );
        })}
      </ScrollView>
    </View>
  );
}

function normalizeProgressPhotoUrl(entry: BodyProgressEntryRecord) {
  const value =
    entry.photoUrl ??
    entry.photoAsset?.url ??
    (entry.photoAssetId ? `/api/files/${entry.photoAssetId}/content` : undefined);
  if (!value) {
    return undefined;
  }
  return /^https?:\/\//i.test(value) ? value : toWebUrl(value);
}

function HabitProgressCard({
  habits,
}: {
  habits: Array<{
    id?: string;
    name?: string | null;
    title?: string | null;
    cadence?: string | null;
    streakCount?: number | null;
    targetCount?: number | null;
    completedCount?: number | null;
  }>;
}) {
  const topHabit = habits[0];
  const completed = topHabit?.completedCount ?? 0;
  const target = topHabit?.targetCount ?? 0;
  const completion = target > 0 ? Math.min(100, Math.round((completed / target) * 100)) : 0;

  return (
    <GlassCard variant="compact" style={styles.progressCardFrame} contentStyle={styles.progressCard}>
      <View style={styles.progressCardHeader}>
        <IconBubble icon="repeat-outline" tone="violet" size={34} />
        <View style={styles.progressCardCopy}>
          <Text style={styles.progressCardTitle}>Habits</Text>
          <Text style={styles.progressCardSubtitle}>{habits.length} active</Text>
        </View>
      </View>
      <Text numberOfLines={1} style={styles.habitName}>
        {topHabit?.title ?? topHabit?.name ?? "Daily habit"}
      </Text>
      <View style={styles.habitBar}>
        <View style={[styles.habitFill, { width: `${Math.max(8, completion)}%` }]} />
      </View>
      <Text style={styles.progressNote}>
        {target > 0
          ? `${completed}/${target} this ${topHabit?.cadence?.toLowerCase() ?? "cycle"}`
          : `${topHabit?.streakCount ?? 0} day streak`}
      </Text>
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
    paddingBottom: layout.bottomNavContentPadding + layout.stickyActionHeight,
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
  progressGrid: {
    flexDirection: "row",
    gap: 10,
    flexWrap: "wrap",
  },
  progressCardFrame: {
    flexGrow: 1,
    flexBasis: "48%",
    minWidth: 0,
  },
  progressCard: {
    minHeight: 150,
    gap: spacing.sm,
  },
  progressCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progressCardCopy: {
    flex: 1,
    gap: 2,
  },
  progressCardTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  progressCardSubtitle: {
    color: colors.muted,
    ...typography.small,
  },
  readoutRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  readoutBlock: {
    flex: 1,
    gap: 2,
  },
  readoutValue: {
    color: colors.text,
    ...typography.cardTitle,
  },
  readoutLabel: {
    color: colors.muted,
    ...typography.small,
  },
  progressNote: {
    color: colors.muted,
    ...typography.small,
  },
  timelineSection: {
    gap: spacing.sm,
  },
  photoTimeline: {
    gap: 10,
    paddingRight: layout.screenPadding,
  },
  photoTimelineCard: {
    width: 168,
  },
  photoTimelineCardContent: {
    gap: spacing.sm,
  },
  photoFrame: {
    height: 142,
    borderRadius: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.055)",
  },
  photoImage: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  photoPlaceholderText: {
    color: colors.subtle,
    ...typography.small,
  },
  photoTimelineCopy: {
    gap: 2,
  },
  photoTimelineDate: {
    color: colors.lime,
    ...typography.caption,
  },
  photoTimelineTitle: {
    color: colors.text,
    ...typography.bodyStrong,
  },
  photoTimelineMeta: {
    color: colors.muted,
    ...typography.small,
  },
  habitName: {
    color: colors.text,
    ...typography.cardTitle,
  },
  habitPromptContent: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  habitPromptCopy: {
    flex: 1,
    gap: 2,
  },
  habitPromptTitle: {
    color: colors.text,
    ...typography.cardTitle,
  },
  habitPromptBody: {
    color: colors.muted,
    ...typography.small,
  },
  habitBar: {
    height: 7,
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  habitFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: colors.violet,
  },
  streakIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  streakText: {
    color: colors.amber,
    ...typography.caption,
  },
  loadingContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  loadingSkeletonCopy: {
    flex: 1,
    gap: 8,
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
  todayDetail: {
    color: colors.muted,
    ...typography.small,
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
