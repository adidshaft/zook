import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { elevation, radii, spacing, typography, useTheme } from "@/lib/theme";

import { ZookChip, type PillTone } from "./chips";
import { IconBubble } from "./icon-bubble";
import { getTonePalette } from "./tone-palette";

type IconName = keyof typeof Ionicons.glyphMap;

export function MetricTile({
  label,
  value,
  detail,
  tone = "neutral",
  icon,
  style,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: PillTone;
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette: themePalette, mode } = useTheme();
  const tonePalette = getTonePalette(tone, mode, themePalette);

  return (
    <View
      style={[
        styles.metricTile,
        {
          borderColor: tonePalette.borderColor,
          backgroundColor: tonePalette.backgroundColor,
        },
        style,
      ]}
    >
      {icon ? <IconBubble icon={icon} tone={tone} size={34} /> : null}
      <Text style={[styles.metricTileLabel, { color: themePalette.text.secondary }]} numberOfLines={2}>
        {label}
      </Text>
      <Text
        style={[styles.metricTileValue, { color: tonePalette.color }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {value}
      </Text>
      {detail ? (
        <Text style={[styles.metricTileDetail, { color: themePalette.text.tertiary }]} numberOfLines={2}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

export function InfoRow({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: PillTone;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: palette.text.secondary }]}>{label}</Text>
      <ZookChip tone={tone}>{value}</ZookChip>
    </View>
  );
}

export function StatusRing({
  tone = "lime",
  value,
  label,
  icon,
  size = 92,
  progress = 0.73,
}: {
  tone?: PillTone;
  value?: string;
  label?: string;
  icon?: IconName;
  size?: number;
  progress?: number;
}) {
  const { palette: themePalette, mode } = useTheme();
  const tonePalette = getTonePalette(tone, mode, themePalette);
  const activeRotation = progress >= 0.7 ? "34deg" : progress >= 0.45 ? "-24deg" : "-72deg";
  const ringShadow =
    tone !== "neutral"
      ? elevation(4, tonePalette.color, {
          shadowOpacity: mode === "dark" ? 0.18 : 0.08,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 0 },
        })
      : null;

  return (
    <View
      style={[
        styles.statusRing,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: themePalette.border.subtle,
        },
        ringShadow,
      ]}
    >
      <View
        style={[
          styles.statusRingArc,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            borderTopColor: tonePalette.color,
            borderRightColor: tonePalette.color,
            borderBottomColor: "transparent",
            borderLeftColor: "transparent",
            transform: [{ rotate: activeRotation }],
          },
        ]}
      />
      <View style={styles.statusRingCenter}>
        {icon ? (
          <Ionicons name={icon} size={Math.round(size * 0.36)} color={tonePalette.color} />
        ) : null}
        {value ? <Text style={[styles.statusRingValue, { color: tonePalette.color }]}>{value}</Text> : null}
        {label ? (
          <Text style={[styles.statusRingLabel, { color: themePalette.text.secondary }]}>{label}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  metricTile: {
    flex: 1,
    minHeight: 96,
    borderRadius: radii.smallCard,
    borderWidth: 1,
    padding: spacing.lg,
    gap: 7,
  },
  metricTileLabel: {
    ...typography.caption,
  },
  metricTileValue: {
    ...typography.metric,
  },
  metricTileDetail: {
    ...typography.caption,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  infoLabel: {
    ...typography.caption,
    flex: 1,
  },
  statusRing: {
    borderWidth: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statusRingArc: {
    position: "absolute",
    borderWidth: 8,
    borderLeftColor: "transparent",
    borderBottomColor: "transparent",
    backgroundColor: "transparent",
  },
  statusRingCenter: {
    alignItems: "center",
    justifyContent: "center",
    gap: 1,
  },
  statusRingValue: {
    ...typography.cardTitle,
  },
  statusRingLabel: {
    ...typography.caption,
  },
});
