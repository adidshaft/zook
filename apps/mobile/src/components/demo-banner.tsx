import { Text, View } from "react-native";

import { useRoleContext } from "@/lib/role-context";
import { spacing, typography, useTheme } from "@/lib/theme";

export function DemoBanner() {
  const ctx = useRoleContext();
  const { palette } = useTheme();
  if (!ctx?.isDemo) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: palette.surface.warningSoft,
        borderBottomColor: palette.border.subtle,
        borderBottomWidth: 1,
        paddingHorizontal: spacing.md,
        paddingTop: 7,
        paddingBottom: 7,
      }}
    >
      <Text
        style={{
          ...typography.caption,
          color: palette.text.primary,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        Demo data - not your real gym
      </Text>
    </View>
  );
}
