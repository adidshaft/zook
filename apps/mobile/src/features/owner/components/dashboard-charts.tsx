import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type {
  OwnerDashboardChartPoint,
  OwnerDashboardCharts,
  OwnerDashboardPlanMixPoint,
} from "@/lib/domains/shared/types";
import { formatCompactNumber, formatInr, formatSignedPercent } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { radii, spacing, typography, useTheme } from "@/lib/theme";

function pointMax(points: OwnerDashboardChartPoint[]) {
  return Math.max(1, ...points.map((point) => Math.max(0, point.value)));
}

function ChartBars({
  accent,
  accessibilityLabel,
  labelColor,
  points,
}: {
  accent: string;
  accessibilityLabel: string;
  labelColor: string;
  points: OwnerDashboardChartPoint[];
}) {
  const max = pointMax(points);
  return (
    <View style={styles.bars} accessibilityLabel={accessibilityLabel}>
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
  const t = useT();
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
      <ChartBars
        accent={palette.accent.fill}
        accessibilityLabel={t("owner.dashboard.chartAccessibility")}
        labelColor={palette.text.tertiary}
        points={points}
      />
    </View>
  );
}

function PlanMix({ plans }: { plans: OwnerDashboardPlanMixPoint[] }) {
  const { palette } = useTheme();
  const t = useT();
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
          <Text style={[styles.eyebrow, { color: palette.text.tertiary }]}>{t("owner.dashboard.planMix")}</Text>
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
                    {t("owner.dashboard.activeCount", { count: formatCompactNumber(plan.value) })}
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
            {t("owner.dashboard.noActiveMemberPlans")}
          </Text>
        )}
      </View>
    </View>
  );
}

export function OwnerDashboardCharts({ charts }: { charts?: OwnerDashboardCharts }) {
  const { palette } = useTheme();
  const t = useT();
  const [expanded, setExpanded] = useState(false);
  if (!charts) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionCopy}>
          <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>
            {t("owner.dashboard.trends")}
          </Text>
          <Text style={[styles.sectionSubtitle, { color: palette.text.tertiary }]}>
            {t("owner.dashboard.trendsSubtitle")}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            expanded ? t("owner.dashboard.collapseTrends") : t("owner.dashboard.expandTrends")
          }
          onPress={() => setExpanded((value) => !value)}
          style={({ pressed }) => [
            styles.expandAction,
            { backgroundColor: palette.surface.raised, borderColor: palette.border.subtle },
            pressed ? styles.expandActionPressed : null,
          ]}
        >
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={palette.text.secondary}
          />
        </Pressable>
      </View>
      <ChartCard
        title={t("owner.dashboard.revenue7Days")}
        format="currency"
        points={charts.revenue7d ?? []}
        delta={charts.deltas?.revenue7d}
      />
      {expanded ? (
        <>
          <ChartCard
            title={t("owner.dashboard.attendance7Days")}
            points={charts.attendance7d ?? []}
            delta={charts.deltas?.attendance7d}
          />
          <ChartCard
            title={t("owner.dashboard.members30Days")}
            points={charts.memberGrowth30d ?? []}
            delta={charts.deltas?.memberGrowth30d}
          />
          <PlanMix plans={charts.planMix ?? []} />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  sectionCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  sectionTitle: {
    ...typography.sectionTitle,
  },
  sectionSubtitle: {
    ...typography.caption,
  },
  expandAction: {
    alignItems: "center",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  expandActionPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
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
