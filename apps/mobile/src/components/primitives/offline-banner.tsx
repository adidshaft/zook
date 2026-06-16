import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { spacing, typography, useTheme } from "@/lib/theme";

export function OfflineBanner({
  children = "Offline. Changes will sync when connection returns.",
}: {
  children?: ReactNode;
}) {
  const { palette } = useTheme();

  return (
    <View
      accessibilityRole="alert"
      style={[
        styles.offlineBanner,
        {
          borderColor: palette.feedback.warning,
          backgroundColor: palette.surface.warningSoft,
        },
      ]}
    >
      <Ionicons name="cloud-offline-outline" size={16} color={palette.feedback.warning} />
      <Text style={[styles.offlineBannerText, { color: palette.text.primary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  offlineBanner: {
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  offlineBannerText: {
    flex: 1,
    ...typography.small,
  },
});
