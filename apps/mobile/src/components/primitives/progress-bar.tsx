import { StyleSheet, Text, View } from "react-native";

import { spacing, typography, useTheme } from "@/lib/theme";
import { useTonePalette, type PillTone } from "./tone-palette";

export function ProgressBar({
  value,
  tone = "lime",
  label,
}: {
  value: number;
  tone?: PillTone;
  label?: string;
}) {
  const { palette: themePalette } = useTheme();
  const palette = useTonePalette(tone);
  const percent = Math.max(0, Math.min(1, value));

  return (
    <View style={styles.progressBarGroup}>
      {label ? (
        <Text style={[styles.progressBarLabel, { color: themePalette.text.secondary }]}>
          {label}
        </Text>
      ) : null}
      <View style={[styles.progressBarTrack, { backgroundColor: themePalette.bg.sunken }]}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${percent * 100}%`, backgroundColor: palette.color },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progressBarGroup: {
    gap: spacing.sm,
  },
  progressBarLabel: {
    ...typography.caption,
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
  },
});
