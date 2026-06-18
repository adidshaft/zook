import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { spacing, useTheme } from "@/lib/theme";

export function SectionLabel({ title, action }: { title: string; action?: ReactNode }) {
  const { palette } = useTheme();

  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: palette.text.primary }]}>{title}</Text>
      {action ? <View>{action}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
});
