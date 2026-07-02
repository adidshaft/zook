import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  Card,
  ScreenHeader,
  Skeleton,
  QueryErrorState,
  TrendSparkline,
  type TrendSparklinePoint,
  ZookScreen,
} from "@/components/primitives";
import { WorkoutLogCard } from "@/components/tracking";
import { useMyBodyProgress, useMyTrackingWorkouts, type BodyProgressEntryRecord } from "@/lib/domains";
import { useT } from "@/lib/i18n";
import { workoutToEntry } from "@/lib/tracking-view";
import { layout, spacing, typography, useTheme } from "@/lib/theme";

type TrackingWorkout = Parameters<typeof workoutToEntry>[0];
type BodyMetricKey = "weightKg" | "waistCm" | "bodyFatPercent";

const bodyMetricConfig: Array<{ key: BodyMetricKey; unit: string }> = [
  { key: "weightKg", unit: "kg" },
  { key: "waistCm", unit: "cm" },
  { key: "bodyFatPercent", unit: "%" },
];

function bodyMetricLabel(key: BodyMetricKey, t: ReturnType<typeof useT>) {
  if (key === "weightKg") {
    return t("tracking.weight");
  }
  if (key === "waistCm") {
    return t("tracking.waist");
  }
  return t("tracking.bodyFat");
}

function bodyMetricValue(entry: BodyProgressEntryRecord, key: BodyMetricKey) {
  const raw = key === "bodyFatPercent"
    ? entry.bodyFatPercent ?? entry.bodyFatPct
    : entry[key];
  const value = typeof raw === "number" ? raw : Number(raw);
  return Number.isFinite(value) ? value : null;
}

function bodyMetricTrend(entries: BodyProgressEntryRecord[], key: BodyMetricKey): TrendSparklinePoint[] {
  return entries
    .map((entry): TrendSparklinePoint | null => {
      const value = bodyMetricValue(entry, key);
      if (value === null || !entry.measuredAt) {
        return null;
      }
      return { date: entry.measuredAt, value };
    })
    .filter((point): point is TrendSparklinePoint => point !== null);
}

export default function TrackingHistoryScreen() {
  const router = useRouter();
  const { palette } = useTheme();
  const t = useT();
  const workoutsQuery = useMyTrackingWorkouts();
  const bodyProgressQuery = useMyBodyProgress();
  const workouts = (workoutsQuery.data?.workouts ?? []) as TrackingWorkout[];
  const bodyEntries = bodyProgressQuery.data?.entries ?? [];
  const latest = bodyEntries[0];

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
          <ScreenHeader title={t("tracking.historyTitle")} showBack />
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
              <View style={styles.trendStack}>
                {bodyMetricConfig.map((metric) => (
                  <TrendSparkline
                    key={metric.key}
                    label={bodyMetricLabel(metric.key, t)}
                    labels={{
                      min: t("tracking.trend.min"),
                      max: t("tracking.trend.max"),
                      latest: t("tracking.trend.latest"),
                    }}
                    points={bodyMetricTrend(bodyEntries, metric.key)}
                    unit={metric.unit}
                  />
                ))}
              </View>
            ) : null}
            {!workoutsQuery.isLoading && !bodyProgressQuery.isLoading ? (
              <Card variant="compact" padding={12} contentStyle={styles.bodyCard}>
                {latest ? (
                  <View style={styles.bodySummaryRow}>
                    <View style={[styles.bodySummaryIcon, { backgroundColor: palette.surface.accentSoft }]}>
                      <Ionicons name="body-outline" size={17} color={palette.accent.base} />
                    </View>
                    <Text numberOfLines={1} style={[styles.cardTitle, { color: palette.text.primary }]}>
                      {t("tracking.bodyProgress")}
                    </Text>
                    <View style={styles.bodyMetrics}>
                      <View style={styles.bodyMetric}>
                        <Ionicons name="scale-outline" size={14} color={palette.text.secondary} />
                        <Text numberOfLines={1} style={[styles.metricValue, { color: palette.text.primary }]}>
                          {latest.weightKg ?? "-"} kg
                        </Text>
                      </View>
                      <View style={styles.bodyMetric}>
                        <Ionicons name="resize-outline" size={14} color={palette.text.secondary} />
                        <Text numberOfLines={1} style={[styles.metricValue, { color: palette.text.primary }]}>
                          {latest.waistCm ?? "-"} cm
                        </Text>
                      </View>
                    </View>
                  </View>
                ) : (
                  <View style={styles.emptyInline}>
                    <View style={styles.emptyInlineCopy}>
                      <Ionicons name="body-outline" size={18} color={palette.text.secondary} />
                      <View style={styles.emptyTextStack}>
                        <Text style={[styles.emptyInlineTitle, { color: palette.text.primary }]} numberOfLines={1}>
                          {t("tracking.noBodyMeasurements")}
                        </Text>
                        <Text style={[styles.emptyInlineBody, { color: palette.text.secondary }]} numberOfLines={2}>
                          {t("tracking.noBodyMeasurementsBody")}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t("tracking.bodyMeasurements")}
                      onPress={() => router.push("/tracking-entry?mode=body" as never)}
                      style={({ pressed }) => [
                        styles.inlineAction,
                        { borderColor: palette.border.default, backgroundColor: palette.surface.raised },
                        pressed ? styles.inlineActionPressed : null,
                      ]}
                    >
                      <Ionicons name="add-outline" size={17} color={palette.text.primary} />
                      <Text style={[styles.inlineActionText, { color: palette.text.primary }]}>
                        {t("tracking.bodyMeasurements")}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </Card>
            ) : null}
            {workouts.map((workout, index) => (
              <WorkoutLogCard key={workout.id} compact entry={workoutToEntry(workout)} testID={index === 0 ? "tracking-history-workout-first" : undefined} />
            ))}
            {!workouts.length && !workoutsQuery.isLoading ? (
              <Card variant="compact" padding={12}>
                <View style={styles.emptyInline}>
                  <View style={styles.emptyInlineCopy}>
                    <Ionicons name="barbell-outline" size={18} color={palette.text.secondary} />
                    <View style={styles.emptyTextStack}>
                      <Text style={[styles.emptyInlineTitle, { color: palette.text.primary }]} numberOfLines={1}>
                        {t("tracking.noWorkoutsYet")}
                      </Text>
                      <Text style={[styles.emptyInlineBody, { color: palette.text.secondary }]} numberOfLines={2}>
                        {t("tracking.noWorkoutsYetBody")}
                      </Text>
                    </View>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t("member.progress.logWorkout")}
                    onPress={() => router.push("/tracking-entry?mode=workout" as never)}
                    style={({ pressed }) => [
                      styles.inlineAction,
                      { borderColor: palette.border.default, backgroundColor: palette.surface.raised },
                      pressed ? styles.inlineActionPressed : null,
                    ]}
                  >
                    <Ionicons name="add-outline" size={17} color={palette.text.primary} />
                    <Text style={[styles.inlineActionText, { color: palette.text.primary }]}>
                      {t("member.progress.logWorkout")}
                    </Text>
                  </Pressable>
                </View>
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
  trendStack: { gap: spacing.sm },
  bodyCard: { gap: 10 },
  cardTitle: typography.cardTitle,
  loadingCard: { gap: spacing.sm },
  bodySummaryRow: { alignItems: "center", flexDirection: "row", gap: spacing.sm },
  bodySummaryIcon: {
    alignItems: "center",
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  bodyMetrics: { alignItems: "center", flexDirection: "row", gap: spacing.sm, marginLeft: "auto" },
  bodyMetric: { alignItems: "center", flexDirection: "row", gap: 4 },
  metricValue: {
    ...typography.caption,
    fontWeight: "800",
  },
  emptyInline: {
    alignItems: "stretch",
    gap: spacing.sm,
  },
  emptyInlineCopy: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  emptyTextStack: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  emptyInlineTitle: typography.bodyStrong,
  emptyInlineBody: typography.caption,
  inlineAction: {
    alignItems: "center",
    alignSelf: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  inlineActionPressed: {
    opacity: 0.84,
    transform: [{ scale: 0.97 }],
  },
  inlineActionText: {
    ...typography.caption,
    fontFamily: "Inter_700Bold",
  },
});
