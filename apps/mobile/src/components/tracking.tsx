import type { TrackingSummaryMetric, WorkoutLogEntry } from "@zook/core";
import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";
import { useT } from "@/lib/i18n";
import { gradients, gradientsLight, radii, useTheme } from "@/lib/theme";

export function TrackingSummaryTile({ metric }: { metric: TrackingSummaryMetric }) {
  const { palette, mode } = useTheme();
  const sheenColors = mode === "light" ? gradientsLight.cardSheen : gradients.cardSheen;
  return (
    <View
      style={[
        styles.summaryTile,
        {
          borderColor: palette.border.default,
          backgroundColor: palette.surface.raised,
        },
      ]}
    >
      <LinearGradient
        colors={sheenColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <Text style={[styles.summaryLabel, { color: palette.text.secondary }]}>
        {metric.label}
      </Text>
      <Text style={[styles.summaryValue, { color: palette.text.primary }]}>
        {metric.value}
      </Text>
      <Text
        style={[
          styles.summaryDetail,
          {
            color: /^[+-]/.test(metric.detail) ? palette.accent.base : palette.text.secondary,
          },
        ]}
      >
        {metric.detail}
      </Text>
    </View>
  );
}

export function WorkoutLogCard({
  entry,
  compact = false,
  testID,
}: {
  entry: WorkoutLogEntry;
  compact?: boolean;
  testID?: string;
}) {
  const t = useT();
  const { palette } = useTheme();
  const visibleExercises = compact ? entry.exercises.slice(0, 3) : entry.exercises;

  return (
    <View
      testID={testID}
      style={[
        styles.logCard,
        {
          borderColor: palette.border.default,
          backgroundColor: palette.surface.raised,
        },
        compact ? styles.logCardCompact : null,
      ]}
    >
      <View style={styles.logHeader}>
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.logDate, { color: palette.text.secondary }]}>
            {entry.dateLabel}
          </Text>
          <Text style={[styles.logTitle, { color: palette.text.primary }, compact ? styles.logTitleCompact : null]}>
            {entry.workoutName}
          </Text>
        </View>
        <View
          style={[
            styles.effortPill,
            {
              backgroundColor: palette.surface.accentSoft,
              borderColor: palette.border.focus,
            },
          ]}
        >
          <Text style={[styles.effortText, { color: palette.accent.base }]}>
            {entry.effortLabel}
          </Text>
        </View>
      </View>

      <View style={[styles.metaRow, compact ? styles.metaRowCompact : null]}>
        <MetaPill label={t("tracking.start")} value={entry.startTimeLabel} compact={compact} />
        <MetaPill label={t("tracking.end")} value={entry.endTimeLabel} compact={compact} />
        <MetaPill label={t("tracking.duration")} value={entry.durationLabel} compact={compact} />
      </View>

      <Text style={[styles.focusText, { color: palette.feedback.warning }]}>
        {t("tracking.focus")}: {entry.focusLabel}
      </Text>

      <View style={styles.exerciseList}>
        {visibleExercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseRow}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.exerciseName, { color: palette.text.primary }]}>
                {exercise.name}
              </Text>
              <Text style={[styles.exerciseMeta, { color: palette.text.secondary }]}>
                {exercise.setsLabel} · {exercise.repsLabel}
                {exercise.loadLabel ? ` · ${exercise.loadLabel}` : ""}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                exercise.status === "DONE"
                  ? {
                      backgroundColor: palette.surface.successSoft,
                      borderColor: palette.feedback.success,
                    }
                  : exercise.status === "OPTIONAL"
                    ? {
                        backgroundColor: palette.surface.warningSoft,
                        borderColor: palette.feedback.warning,
                      }
                    : {
                        backgroundColor: palette.surface.dangerSoft,
                        borderColor: palette.feedback.danger,
                      },
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      exercise.status === "DONE"
                        ? palette.feedback.success
                        : exercise.status === "OPTIONAL"
                          ? palette.feedback.warning
                          : palette.feedback.danger,
                  },
                ]}
              >
                {exercise.status}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Text
        style={[
          styles.notesText,
          { color: palette.text.secondary },
          compact ? styles.notesTextCompact : null,
        ]}
        numberOfLines={compact ? 2 : undefined}
      >
        {entry.notes}
      </Text>
    </View>
  );
}

function MetaPill({ label, value, compact = false }: { label: string; value: string; compact?: boolean }) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.metaPill,
        { backgroundColor: palette.bg.sunken },
        compact ? styles.metaPillCompact : null,
      ]}
    >
      <Text style={[styles.metaLabel, { color: palette.text.secondary }]}>
        {label}
      </Text>
      <Text style={[styles.metaValue, { color: palette.text.primary }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  summaryTile: {
    width: "48%",
    borderRadius: 20,
    borderCurve: "continuous",
    borderWidth: 1,
    overflow: "hidden",
    padding: 14,
    minHeight: 112,
    gap: 7
  },
  summaryLabel: {
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
    borderWidth: 1,
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
    fontSize: 12,
    fontWeight: "700"
  },
  logTitle: {
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
    borderWidth: 1,
  },
  effortText: {
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
    padding: 12,
    gap: 4
  },
  metaPillCompact: {
    borderRadius: 14,
    padding: 9,
    gap: 2
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: "700"
  },
  metaValue: {
    fontSize: 16,
    fontWeight: "800"
  },
  focusText: {
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
    fontSize: 16,
    fontWeight: "800"
  },
  exerciseMeta: {
    fontSize: 12
  },
  statusPill: {
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1
  },
  statusText: {
    fontSize: 11,
    fontWeight: "800"
  },
  notesText: {
    lineHeight: 20
  },
  notesTextCompact: {
    fontSize: 12,
    lineHeight: 17
  }
});
