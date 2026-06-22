import { StyleSheet, Text, View } from "react-native";

import { useRoleContext } from "@/lib/role-context";
import { spacing, typography, useTheme } from "@/lib/theme";

export function DemoBanner() {
  const ctx = useRoleContext();
  const { palette } = useTheme();
  if (!ctx?.isDemo) return null;
  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.capsule,
        {
          backgroundColor: palette.surface.warningSoft,
          borderColor: palette.border.subtle,
        },
      ]}
    >
      <Text
        style={{
          ...typography.caption,
          color: palette.text.primary,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        Demo data
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  capsule: {
    alignSelf: "center",
    borderCurve: "continuous",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 28,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
});
