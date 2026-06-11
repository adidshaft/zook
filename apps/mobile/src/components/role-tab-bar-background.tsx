import { BlurView } from "expo-blur";
import { Platform, StyleSheet } from "react-native";

import type { ThemeMode } from "@/lib/theme";
import { useTheme } from "@/lib/theme";

export function RoleTabBarBackground({ mode }: { mode: ThemeMode }) {
  const { palette } = useTheme();
  if (Platform.OS !== "ios") return null;

  return (
    <BlurView
      pointerEvents="none"
      intensity={mode === "dark" ? 18 : 16}
      tint={mode === "dark" ? "dark" : "light"}
      style={[
        StyleSheet.absoluteFillObject,
        styles.material,
        {
          backgroundColor:
            mode === "dark" ? "rgba(18,20,19,0.64)" : "rgba(255,255,255,0.72)",
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  material: {
    borderRadius: 26,
    overflow: "hidden",
  },
});
