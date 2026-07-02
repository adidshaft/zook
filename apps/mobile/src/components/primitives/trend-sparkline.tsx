import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, LinearGradient as SvgLinearGradient, Polygon, Polyline, Stop } from "react-native-svg";

import { gradients, layout, spacing, typography, useTheme } from "@/lib/theme";

export type TrendSparklinePoint = {
  date: string | Date;
  value: number;
};

const chartWidth = 320;
const chartHeight = 96;
const chartPadding = 10;
const trendWindowMs = 90 * 24 * 60 * 60 * 1000;

function pointTime(point: TrendSparklinePoint) {
  const date = point.date instanceof Date ? point.date : new Date(point.date);
  const time = date.getTime();
  return Number.isFinite(time) ? time : null;
}

function formatValue(value: number, unit?: string) {
  const rounded = Number.isInteger(value) ? `${value}` : value.toFixed(1);
  return unit ? `${rounded} ${unit}` : rounded;
}

export function TrendSparkline({
  label,
  labels,
  points,
  unit,
}: {
  label: string;
  labels: { min: string; max: string; latest: string };
  points: TrendSparklinePoint[];
  unit?: string;
}) {
  const { palette } = useTheme();
  const normalized = useMemo(() => {
    const now = Date.now();
    const dated = points
      .map((point) => ({ ...point, time: pointTime(point) }))
      .filter((point): point is TrendSparklinePoint & { time: number } => point.time !== null)
      .filter((point) => point.time >= now - trendWindowMs)
      .sort((a, b) => a.time - b.time);

    if (dated.length < 2) {
      return null;
    }

    const values = dated.map((point) => point.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const latest = dated[dated.length - 1];
    const firstTime = dated[0].time;
    const lastTime = latest.time;
    const valueRange = max - min || 1;
    const timeRange = lastTime - firstTime || 1;
    const plotWidth = chartWidth - chartPadding * 2;
    const plotHeight = chartHeight - chartPadding * 2;
    const coordinates = dated.map((point) => {
      const x = chartPadding + ((point.time - firstTime) / timeRange) * plotWidth;
      const y = chartPadding + (1 - (point.value - min) / valueRange) * plotHeight;
      return { x, y, value: point.value };
    });

    return {
      coordinates,
      latest: coordinates[coordinates.length - 1],
      latestValue: latest.value,
      max,
      min,
    };
  }, [points]);

  if (!normalized) {
    return null;
  }

  const linePoints = normalized.coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `${chartPadding},${chartHeight - chartPadding} ${linePoints} ${chartWidth - chartPadding},${chartHeight - chartPadding}`;

  return (
    <View style={[styles.card, { backgroundColor: palette.surface.default, borderColor: palette.border.subtle }]}>
      <View style={styles.header}>
        <Text numberOfLines={1} style={[styles.title, { color: palette.text.primary }]}>
          {label}
        </Text>
        <Text numberOfLines={1} style={[styles.latest, { color: palette.accent.base }]}>
          {formatValue(normalized.latestValue, unit)}
        </Text>
      </View>
      <Svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <Defs>
          <SvgLinearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={gradients.accentGlow[0]} />
            <Stop offset="1" stopColor={gradients.accentGlow[1]} />
          </SvgLinearGradient>
        </Defs>
        <Polygon points={areaPoints} fill="url(#trendFill)" />
        <Polyline points={linePoints} fill="none" stroke={palette.accent.base} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        <Circle cx={normalized.latest.x} cy={normalized.latest.y} r={4} fill={palette.accent.base} />
      </Svg>
      <View style={styles.footer}>
        <Text numberOfLines={1} style={[styles.footerText, { color: palette.text.secondary }]}>
          {labels.min} {formatValue(normalized.min, unit)}
        </Text>
        <Text numberOfLines={1} style={[styles.footerText, { color: palette.text.secondary }]}>
          {labels.max} {formatValue(normalized.max, unit)}
        </Text>
        <Text numberOfLines={1} style={[styles.footerText, { color: palette.text.secondary }]}>
          {labels.latest} {formatValue(normalized.latestValue, unit)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    gap: spacing.sm,
    maxWidth: layout.contentWidth,
    overflow: "hidden",
    padding: spacing.md,
    width: "100%",
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  title: {
    ...typography.cardTitle,
    flex: 1,
    minWidth: 0,
  },
  latest: {
    ...typography.bodyStrong,
    fontVariant: ["tabular-nums"],
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  footerText: {
    ...typography.caption,
    flex: 1,
  },
});
