import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { useTheme } from "@/lib/theme";
import { getTonePalette, type PillTone } from "./tone-palette";

type IconName = keyof typeof Ionicons.glyphMap;

export function IconBubble({
  accessibilityLabel,
  icon,
  tone = "neutral",
  size = 44,
}: {
  accessibilityLabel?: string;
  icon: IconName;
  tone?: PillTone;
  size?: number;
}) {
  const { palette: themePalette, mode } = useTheme();
  const palette = getTonePalette(tone, mode, themePalette);

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessible={Boolean(accessibilityLabel)}
      style={[
        styles.iconBubble,
        {
          width: size,
          height: size,
          borderRadius: Math.max(14, size / 2.5),
          borderColor: palette.borderColor,
          backgroundColor: palette.backgroundColor,
        },
      ]}
    >
      <Ionicons name={icon} size={Math.max(17, size / 2.25)} color={palette.color} />
    </View>
  );
}

const styles = StyleSheet.create({
  iconBubble: {
    alignItems: "center",
    borderCurve: "continuous",
    justifyContent: "center",
    borderWidth: 1,
  },
});
