import { Link } from "expo-router";
import type { Href } from "expo-router";
import type { TrackingSummaryMetric, WorkoutHistorySeries, WorkoutLogEntry } from "@zook/core";
import { StyleSheet, Text, View } from "react-native";
import { colors, radii } from "@/lib/theme";

const tonePalette = {
  lime: { surface: "rgba(185,244,85,0.1)", ink: colors.lime },
  amber: { surface: "rgba(255,182,80,0.1)", ink: colors.amber },
  blue: { surface: "rgba(125,211,252,0.1)", ink: colors.blue },
  violet: { surface: "rgba(185,169,255,0.1)", ink: colors.violet }
} as const;

export function TrackingSectionHeader({
  title,
  href,
  linkLabel = "See all"
}: {
  title: string;
  href?: Href;
  linkLabel?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>
        {title}
      </Text>
      {href ? (
        <Link href={href}>
          <Text style={styles.sectionLink}>
            {linkLabel}
          </Text>
        </Link>
      ) : null}
    </View>
  );
}

export function TrackingSummaryTile({ metric }: { metric: TrackingSummaryMetric }) {
  const palette = tonePalette[metric.tone];

  return (
    <View style={[styles.summaryTile, { backgroundColor: palette.surface }]}>
      <Text style={styles.summaryLabel}>
        {metric.label}
      </Text>
      <Text style={[styles.summaryValue, { color: palette.ink }]}>
        {metric.value}
      </Text>
      <Text style={[styles.summaryDetail, { color: palette.ink }]}>
        {metric.detail}
      </Text>
    </View>
  );
}

export function WorkoutLogCard({
  entry,
  compact = false
}: {
  entry: WorkoutLogEntry;
  compact?: boolean;
}) {
  const visibleExercises = compact ? entry.exercises.slice(0, 3) : entry.exercises;

  return (
    <View style={[styles.logCard, compact ? styles.logCardCompact : null]}>
      <View style={styles.logHeader}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={styles.logDate}>
            {entry.dateLabel}
          </Text>
          <Text style={[styles.logTitle, compact ? styles.logTitleCompact : null]}>
            {entry.workoutName}
          </Text>
        </View>
        <View style={styles.effortPill}>
          <Text style={styles.effortText}>
            {entry.effortLabel}
          </Text>
        </View>
      </View>

      <View style={[styles.metaRow, compact ? styles.metaRowCompact : null]}>
        <MetaPill label="Start" value={entry.startTimeLabel} compact={compact} />
        <MetaPill label="End" value={entry.endTimeLabel} compact={compact} />
        <MetaPill label="Duration" value={entry.durationLabel} compact={compact} />
      </View>

      <Text style={styles.focusText}>
        Focus: {entry.focusLabel}
      </Text>

      <View style={styles.exerciseList}>
        {visibleExercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.exerciseName}>
                {exercise.name}
              </Text>
              <Text style={styles.exerciseMeta}>
                {exercise.setsLabel} · {exercise.repsLabel}
                {exercise.loadLabel ? ` · ${exercise.loadLabel}` : ""}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                exercise.status === "DONE"
                  ? styles.statusDone
                  : exercise.status === "OPTIONAL"
                    ? styles.statusOptional
                    : styles.statusSkipped
              ]}
            >
              <Text style={styles.statusText}>
                {exercise.status}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={[styles.notesText, compact ? styles.notesTextCompact : null]} numberOfLines={compact ? 2 : undefined}>
        {entry.notes}
      </Text>
    </View>
  );
}

export function WorkoutHistorySummary({ series }: { series: WorkoutHistorySeries }) {
  return (
    <View style={styles.historyCard}>
      <Text style={styles.historyLabel}>
        {series.label}
      </Text>
      <View style={styles.historyMetrics}>
        <View style={styles.historyMetricBlock}>
          <Text style={styles.historyMetricValue}>
            {series.totalDurationLabel}
          </Text>
          <Text style={styles.historyMetricLabel}>
            Total duration
          </Text>
        </View>
        <View style={styles.historyMetricBlock}>
          <Text style={styles.historyMetricValue}>
            {series.sessionCountLabel}
          </Text>
          <Text style={styles.historyMetricLabel}>
            Sessions
          </Text>
        </View>
      </View>
      <View style={styles.historyCallout}>
        <Text style={styles.historyCalloutText}>
          {series.completionLabel}
        </Text>
      </View>
    </View>
  );
}

function MetaPill({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  return (
    <View style={[styles.metaPill, compact ? styles.metaPillCompact : null]}>
      <Text style={styles.metaLabel}>
        {label}
      </Text>
      <Text style={styles.metaValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900"
  },
  sectionLink: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700"
  },
  summaryTile: {
    width: "48%",
    borderRadius: 26,
    padding: 14,
    minHeight: 112,
    gap: 7
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "800"
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 34
  },
  summaryDetail: {
    fontSize: 13,
    lineHeight: 18
  },
  logCard: {
    borderRadius: 30,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    gap: 14
  },
  logCardCompact: {
    borderRadius: 24,
    padding: 14,
    gap: 10
  },
  logHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start"
  },
  logDate: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  logTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28
  },
  logTitleCompact: {
    fontSize: 20,
    lineHeight: 24
  },
  effortPill: {
    borderRadius: radii.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(185,244,85,0.14)",
    borderWidth: 1,
    borderColor: "rgba(185,244,85,0.28)"
  },
  effortText: {
    color: colors.lime,
    fontSize: 12,
    fontWeight: "800"
  },
  metaRow: {
    flexDirection: "row",
    gap: 10
  },
  metaRowCompact: {
    gap: 8
  },
  metaPill: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 12,
    gap: 4
  },
  metaPillCompact: {
    borderRadius: 14,
    padding: 9,
    gap: 2
  },
  metaLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700"
  },
  metaValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  focusText: {
    color: colors.amber,
    fontSize: 12,
    fontWeight: "800"
  },
  exerciseList: {
    gap: 10
  },
  exerciseRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center"
  },
  exerciseName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800"
  },
  exerciseMeta: {
    color: colors.muted,
    fontSize: 12
  },
  statusPill: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1
  },
  statusDone: {
    backgroundColor: "rgba(185,244,85,0.12)",
    borderColor: "rgba(185,244,85,0.26)"
  },
  statusOptional: {
    backgroundColor: "rgba(255,182,80,0.12)",
    borderColor: "rgba(255,182,80,0.26)"
  },
  statusSkipped: {
    backgroundColor: "rgba(255,93,93,0.12)",
    borderColor: "rgba(255,93,93,0.26)"
  },
  statusText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: "800"
  },
  notesText: {
    color: colors.muted,
    lineHeight: 20
  },
  notesTextCompact: {
    fontSize: 12,
    lineHeight: 17
  },
  historyCard: {
    borderRadius: 30,
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
    padding: 18,
    gap: 14
  },
  historyLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700"
  },
  historyMetrics: {
    flexDirection: "row",
    gap: 12
  },
  historyMetricBlock: {
    flex: 1,
    gap: 4
  },
  historyMetricValue: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "900",
    lineHeight: 30
  },
  historyMetricLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700"
  },
  historyCallout: {
    borderRadius: radii.pill,
    backgroundColor: "rgba(185,169,255,0.12)",
    paddingHorizontal: 16,
    paddingVertical: 14
  },
  historyCalloutText: {
    color: colors.violet,
    fontSize: 13,
    fontWeight: "700"
  }
});
