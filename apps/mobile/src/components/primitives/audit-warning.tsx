import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { radii, spacing, typography, useTheme } from "@/lib/theme";

export function AuditWarning({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const { palette } = useTheme();

  return (
    <View
      style={[
        styles.auditWarning,
        compact ? styles.auditWarningCompact : null,
        {
          borderColor: palette.feedback.warning,
          backgroundColor: palette.surface.warningSoft,
        },
      ]}
    >
      <View
        style={[
          styles.iconShell,
          compact ? styles.iconShellCompact : null,
          {
            backgroundColor: palette.surface.warningSoft,
            borderColor: palette.feedback.warning,
          },
        ]}
      >
        <Ionicons name="reader-outline" size={compact ? 15 : 20} color={palette.feedback.warning} />
      </View>
      <Text
        numberOfLines={compact ? 2 : undefined}
        style={[
          styles.auditWarningText,
          compact ? styles.auditWarningTextCompact : null,
          { color: palette.text.primary },
        ]}
      >
        {children}
      </Text>
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
  auditWarningCompact: {
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
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
  iconShellCompact: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  auditWarningText: {
    flex: 1,
    ...typography.body,
  },
  auditWarningTextCompact: {
    ...typography.caption,
    lineHeight: 15,
  },
});
