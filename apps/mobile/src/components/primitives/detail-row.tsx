import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";

import { spacing, typography, useTheme } from "@/lib/theme";

export function DetailRow({
  label,
  value,
  trailing,
}: {
  label: string;
  value: string;
  trailing?: ReactNode;
}) {
  const { palette } = useTheme();

  return (
    <View style={[styles.detailRow, { borderBottomColor: palette.border.subtle }]}>
      <Text style={[styles.detailRowLabel, { color: palette.text.secondary }]}>{label}</Text>
      <View style={styles.detailRowValueWrap}>
        <Text style={[styles.detailRowValue, { color: palette.text.primary }]}>{value}</Text>
        {trailing}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    minHeight: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    borderBottomWidth: 1,
    paddingVertical: spacing.sm,
  },
  detailRowLabel: {
    ...typography.small,
    flex: 1,
  },
  detailRowValueWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.sm,
    flex: 1.2,
  },
  detailRowValue: {
    ...typography.bodyStrong,
    textAlign: "right",
  },
});
