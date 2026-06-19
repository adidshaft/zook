import { StyleSheet, Text, View } from "react-native";

import type {
  OwnerDashboardChartPoint,
  OwnerDashboardCharts,
  OwnerDashboardPlanMixPoint,
} from "@/lib/domains/shared/types";
import { formatCompactNumber, formatInr, formatSignedPercent } from "@/lib/formatting";
import { radii, spacing, typography, useTheme } from "@/lib/theme";

function pointMax(points: OwnerDashboardChartPoint[]) {
  return Math.max(1, ...points.map((point) => Math.max(0, point.value)));
}

function ChartBars({
  accent,
  labelColor,
  points,
}: {
  accent: string;
  labelColor: string;
  points: OwnerDashboardChartPoint[];
}) {
  const max = pointMax(points);
  return (
    <View style={styles.bars} accessibilityLabel="Dashboard chart">
      {points.map((point, index) => {
        const height = Math.max(6, Math.round((Math.max(0, point.value) / max) * 72));
        return (
          <View key={`${point.date}-${index}`} style={styles.barSlot}>
            <View style={[styles.bar, { height, backgroundColor: accent }]} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
              style={[styles.barLabel, { color: labelColor }]}
            >
              {point.label || " "}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function ChartCard({
  delta,
  format = "number",
  points,
  title,
}: {
  delta?: number;
  format?: "currency" | "number";
  points: OwnerDashboardChartPoint[];
  title: string;
}) {
  const { palette } = useTheme();
  const latest = points.at(-1)?.value ?? 0;
  const value = format === "currency" ? formatInr(latest * 100) : formatCompactNumber(latest);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface.raised, borderColor: palette.border.default },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleBlock}>
          <Text style={[styles.eyebrow, { color: palette.text.tertiary }]}>{title}</Text>
          <Text style={[styles.value, { color: palette.text.primary }]}>{value}</Text>
        </View>
        <Text
          style={[
            styles.delta,
            {
              color:
                (delta ?? 0) >= 0 ? palette.feedback.success : palette.feedback.danger,
              backgroundColor:
                (delta ?? 0) >= 0 ? palette.surface.successSoft : palette.surface.dangerSoft,
            },
          ]}
        >
          {formatSignedPercent(delta)}
        </Text>
      </View>
      <ChartBars accent={palette.accent.fill} labelColor={palette.text.tertiary} points={points} />
    </View>
  );
}

function PlanMix({ plans }: { plans: OwnerDashboardPlanMixPoint[] }) {
  const { palette } = useTheme();
  const total = plans.reduce((sum, plan) => sum + plan.value, 0);
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.surface.raised, borderColor: palette.border.default },
      ]}
    >
      <View style={styles.cardHeader}>
        <View style={styles.titleBlock}>
          <Text style={[styles.eyebrow, { color: palette.text.tertiary }]}>Plan mix</Text>
          <Text style={[styles.value, { color: palette.text.primary }]}>
            {formatCompactNumber(total)}
          </Text>
        </View>
      </View>
      <View style={styles.planList}>
        {plans.length ? (
          plans.map((plan) => {
            const pct = total ? Math.round((plan.value / total) * 100) : 0;
            return (
              <View key={plan.label} style={styles.planRow}>
                <View style={styles.planCopy}>
                  <Text numberOfLines={1} style={[styles.planName, { color: palette.text.primary }]}>
                    {plan.label}
                  </Text>
                  <Text style={[styles.planMeta, { color: palette.text.tertiary }]}>
                    {formatCompactNumber(plan.value)} active
                  </Text>
                </View>
                <View style={[styles.planTrack, { backgroundColor: palette.bg.sunken }]}>
                  <View
                    style={[
                      styles.planFill,
                      { width: `${pct}%`, backgroundColor: palette.accent.fill },
                    ]}
                  />
                </View>
                <Text style={[styles.planPct, { color: palette.text.secondary }]}>{pct}%</Text>
              </View>
            );
          })
        ) : (
          <Text style={[styles.empty, { color: palette.text.secondary }]}>
            Active member plans show here.
          </Text>
        )}
      </View>
    </View>
  );
}

export function OwnerDashboardCharts({ charts }: { charts?: OwnerDashboardCharts }) {
  const { palette } = useTheme();
  if (!charts) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>Trends</Text>
        <Text style={[styles.sectionSubtitle, { color: palette.text.tertiary }]}>
          Revenue, attendance, and member trends
        </Text>
      </View>
      <ChartCard
        title="Revenue · 7 days"
        format="currency"
        points={charts.revenue7d ?? []}
        delta={charts.deltas?.revenue7d}
      />
      <ChartCard
        title="Attendance · 7 days"
        points={charts.attendance7d ?? []}
        delta={charts.deltas?.attendance7d}
      />
      <ChartCard
        title="Members · 30 days"
        points={charts.memberGrowth30d ?? []}
        delta={charts.deltas?.memberGrowth30d}
      />
      <PlanMix plans={charts.planMix ?? []} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    gap: 2,
  },
  sectionTitle: {
    ...typography.sectionTitle,
  },
  sectionSubtitle: {
    ...typography.caption,
  },
  card: {
    borderWidth: 1,
    borderRadius: radii.card,
    padding: spacing.lg,
    gap: spacing.md,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    ...typography.caption,
    textTransform: "uppercase",
  },
  value: {
    marginTop: 4,
    ...typography.metric,
  },
  delta: {
    overflow: "hidden",
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    ...typography.caption,
    fontVariant: ["tabular-nums"],
  },
  bars: {
    height: 104,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.xs,
  },
  barSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    gap: spacing.xs,
  },
  bar: {
    width: "100%",
    maxWidth: 18,
    borderRadius: radii.small,
  },
  barLabel: {
    width: "100%",
    textAlign: "center",
    ...typography.caption,
  },
  planList: {
    gap: spacing.sm,
  },
  planRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  planCopy: {
    flex: 1,
    minWidth: 0,
  },
  planName: {
    ...typography.bodyStrong,
  },
  planMeta: {
    ...typography.caption,
  },
  planTrack: {
    width: 92,
    height: 8,
    overflow: "hidden",
    borderRadius: radii.pill,
  },
  planFill: {
    height: "100%",
    borderRadius: radii.pill,
  },
  planPct: {
    width: 38,
    textAlign: "right",
    ...typography.caption,
    fontVariant: ["tabular-nums"],
  },
  empty: {
    ...typography.body,
  },
});
