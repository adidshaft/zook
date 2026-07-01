import { StyleSheet, Text, View } from "react-native";

import { useRoleContext } from "@/lib/role-context";
import { spacing, typography, useTheme } from "@/lib/theme";

export function TestDataBanner() {
  const ctx = useRoleContext();
  const { palette } = useTheme();
  if (!ctx?.isDemo) return null;
  return (
    <View
      accessibilityRole="alert"
      pointerEvents="none"
      style={[
        styles.capsule,
        {
          backgroundColor: palette.bg.elevated,
          borderColor: palette.border.subtle,
        },
      ]}
    >
      <Text
        style={{
          ...typography.navLabel,
          color: palette.text.tertiary,
          textAlign: "center",
        }}
      >
        Demo
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 18,
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
});
