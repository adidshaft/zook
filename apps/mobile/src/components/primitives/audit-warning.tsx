import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { radii, spacing, typography, useTheme } from "@/lib/theme";

export function AuditWarning({ children }: { children: ReactNode }) {
  const { palette } = useTheme();

  return (
    <View
      style={[
        styles.auditWarning,
        {
          borderColor: palette.feedback.warning,
          backgroundColor: palette.surface.warningSoft,
        },
      ]}
    >
      <View
        style={[
          styles.iconShell,
          {
            backgroundColor: palette.surface.warningSoft,
            borderColor: palette.feedback.warning,
          },
        ]}
      >
        <Ionicons name="reader-outline" size={20} color={palette.feedback.warning} />
      </View>
      <Text style={[styles.auditWarningText, { color: palette.text.primary }]}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  auditWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderRadius: radii.large,
    borderWidth: 1,
    padding: spacing.md,
  },
  iconShell: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  auditWarningText: {
    flex: 1,
    ...typography.body,
  },
});
