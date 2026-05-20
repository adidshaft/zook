import { Text, View } from "react-native";

import { useRoleContext } from "@/lib/role-context";
import { legacyColors, spacing, typography } from "@/lib/theme";

export function DemoBanner() {
  const ctx = useRoleContext();
  if (!ctx?.isDemo) return null;
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: legacyColors.warning,
        paddingHorizontal: spacing.md,
        paddingVertical: 6,
      }}
    >
      <Text
        style={{
          ...typography.caption,
          color: legacyColors.ink,
          fontWeight: "600",
          textAlign: "center",
        }}
      >
        Demo data - not your real gym
      </Text>
    </View>
  );
}
