import { StyleSheet, Text, View } from "react-native";

import { spacing, typography, useTheme } from "@/lib/theme";
import { SectionLabel } from "./section-label";
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
      <SectionLabel title={title} action={action} />
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
  sectionSubtitle: {
    ...typography.small,
  },
});
