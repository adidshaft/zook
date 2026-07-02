import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

import { radii, typography, useTheme } from "@/lib/theme";
import { useTonePalette, type PillTone } from "./tone-palette";
export type { PillTone } from "./tone-palette";

type IconName = keyof typeof Ionicons.glyphMap;

function pressWithLightHaptic(callback?: () => void) {
  void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  try {
    callback?.();
  } catch (error) {
    console.error("Zook chip action failed", error);
  }
}

export function ZookChip({
  children,
  tone = "neutral",
  icon,
  onPress,
  accessibilityLabel,
  style,
  textStyle,
}: {
  children: ReactNode;
  tone?: PillTone;
  icon?: IconName;
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const { palette: themePalette } = useTheme();
  const palette = useTonePalette(tone);
  const resolvedAccessibilityLabel =
    accessibilityLabel ?? (typeof children === "string" ? children : undefined);
  const chip = (
    <View
      accessibilityLabel={!onPress ? resolvedAccessibilityLabel : undefined}
      accessible={!onPress && Boolean(resolvedAccessibilityLabel)}
      style={[
        styles.chip,
        {
          borderColor: palette.borderColor,
          backgroundColor: palette.backgroundColor,
        },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={13} color={palette.color} /> : null}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={[styles.chipText, { color: palette.color }, textStyle]}
      >
        {children}
      </Text>
    </View>
  );

  if (!onPress) return chip;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={resolvedAccessibilityLabel}
      android_ripple={{ color: themePalette.border.default, borderless: false }}
      onPress={() => pressWithLightHaptic(onPress)}
      style={({ pressed }) => [styles.chipPressable, pressed ? styles.pressed : null]}
    >
      {chip}
    </Pressable>
  );
}

export function Pill(props: Parameters<typeof ZookChip>[0]) {
  return <ZookChip {...props} />;
}

export function normalizePillTone(tone?: PillTone | "danger" | null): PillTone {
  return tone === "danger" ? "red" : (tone ?? "neutral");
}

export function toneForStatusLabel(status: string): PillTone {
  const normalized = status.toLowerCase().replace(/[_-]+/g, " ");
  if (
    normalized.includes("approved") ||
    normalized.includes("active") ||
    normalized.includes("assigned") ||
    normalized.includes("in stock")
  ) {
    return "lime";
  }
  if (
    normalized.includes("pending") ||
    normalized.includes("review") ||
    normalized.includes("desk") ||
    normalized.includes("expiring") ||
    normalized.includes("past due") ||
    normalized.includes("low")
  ) {
    return "amber";
  }
  if (
    normalized.includes("expired") ||
    normalized.includes("flagged") ||
    normalized.includes("failed") ||
    normalized.includes("suspended") ||
    normalized.includes("cancelled") ||
    normalized.includes("canceled")
  ) {
    return "red";
  }
  return "neutral";
}

type StatusChipProps = Omit<Parameters<typeof ZookChip>[0], "children"> & {
  status?: string;
  children?: ReactNode;
};

export function StatusChip({ status, children, tone, ...props }: StatusChipProps) {
  const label = status ?? children;
  const resolvedTone = tone ?? (typeof label === "string" ? toneForStatusLabel(label) : "neutral");
  return (
    <ZookChip {...props} tone={resolvedTone}>
      {label}
    </ZookChip>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: "flex-start",
    flexShrink: 1,
    maxWidth: "100%",
    minWidth: 0,
    minHeight: 26,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: 9,
    paddingVertical: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  chipPressable: {
    minHeight: 44,
    justifyContent: "center",
    alignSelf: "flex-start",
  },
  chipText: {
    ...typography.caption,
    flexShrink: 1,
    minWidth: 0,
  },

  pressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
});
