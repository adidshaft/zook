import { StyleSheet, Text, View } from "react-native";

import { spacing, typography, useTheme } from "@/lib/theme";
import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const { palette } = useTheme();

  return (
    <View style={styles.sectionGroup}>
      {eyebrow ? (
        <Text style={[styles.sectionEyebrow, { color: palette.text.tertiary }]}>{eyebrow}</Text>
      ) : null}
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{title}</Text>
        {action ? <View>{action}</View> : null}
      </View>
      {subtitle ? (
        <Text style={[styles.sectionSubtitle, { color: palette.text.secondary }]}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionGroup: {
    gap: 4,
    marginBottom: spacing.sm,
  },
  sectionEyebrow: {
    ...typography.eyebrow,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: 2,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0,
    lineHeight: 18,
  },
  sectionSubtitle: {
    ...typography.small,
  },
});
