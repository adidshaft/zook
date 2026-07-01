import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

type GradientPoint = { x: number; y: number };

export function LinearGradient({
  colors,
  children,
  style,
  pointerEvents,
}: {
  colors: readonly string[];
  children?: ReactNode;
  start?: GradientPoint;
  end?: GradientPoint;
  locations?: readonly number[];
  style?: StyleProp<ViewStyle>;
  pointerEvents?: "box-none" | "none" | "box-only" | "auto";
}) {
  const fallbackColor = colors[colors.length - 1] ?? colors[0] ?? "transparent";

  return (
    <View pointerEvents={pointerEvents} style={[styles.fallback, { backgroundColor: fallbackColor }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    overflow: "hidden",
  },
});
