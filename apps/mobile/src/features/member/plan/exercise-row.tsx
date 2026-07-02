import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";

import { IconBubble } from "@/components/primitives/icon-bubble";
import { pressWithHaptics } from "@/components/primitives/buttons";
import { radii, spacing, typography, useTheme } from "@/lib/theme";

export function ExerciseRow({
  title,
  detail,
  sets,
  compact = false,
  complete = false,
  onPress,
  style,
}: {
  title: string;
  detail: string;
  sets?: string;
  compact?: boolean;
  complete?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const { palette } = useTheme();
  return (
    <Pressable
      onPress={() => pressWithHaptics(onPress)}
      accessible
      accessibilityRole="checkbox"
      accessibilityLabel={sets ? `${title}, ${sets}, ${detail}` : `${title}, ${detail}`}
      accessibilityState={{ checked: complete }}
      style={({ pressed }) => [
        styles.row,
        {
          borderColor: palette.border.subtle,
          backgroundColor: palette.surface.default,
        },
        compact ? styles.rowCompact : null,
        pressed ? styles.pressed : null,
        style,
      ]}
    >
      <View
        style={[
          styles.check,
          {
            borderColor: complete ? palette.accent.strong : palette.border.strong,
            backgroundColor: complete ? palette.accent.strong : palette.surface.default,
          },
          compact ? styles.checkCompact : null,
        ]}
      >
        {complete ? <Ionicons name="checkmark" size={15} color={palette.text.onAccent} /> : null}
      </View>
      <IconBubble icon="barbell-outline" tone="neutral" size={compact ? 34 : 38} />
      <View style={styles.copy}>
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.84}
          style={[styles.title, compact ? styles.titleCompact : null, { color: palette.text.primary }]}
        >
          {sets ? `${title} · ${sets}` : title}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.detail, compact ? styles.detailCompact : null, { color: palette.text.secondary }]}
        >
          {detail}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  row: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.large,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  rowCompact: {
    minHeight: 50,
    gap: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  check: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCompact: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...typography.bodyStrong,
  },
  titleCompact: {
    ...typography.body,
    lineHeight: 19,
  },
  detail: {
    ...typography.small,
  },
  detailCompact: {
    ...typography.caption,
    lineHeight: 16,
  },
});
