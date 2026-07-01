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
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.84}
          numberOfLines={1}
          style={[styles.sectionTitle, { color: palette.text.primary }]}
        >
          {title}
        </Text>
        {action ? <View style={styles.sectionAction}>{action}</View> : null}
      </View>
      {subtitle ? (
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.88}
          numberOfLines={1}
          style={[styles.sectionSubtitle, { color: palette.text.secondary }]}
        >
          {subtitle}
        </Text>
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
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0,
    lineHeight: 20,
    minWidth: 0,
  },
  sectionAction: {
    flexShrink: 0,
  },
  sectionSubtitle: {
    ...typography.small,
  },
});
