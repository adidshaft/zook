import { StyleSheet, Text, View } from "react-native";

import { Card } from "@/components/primitives";
import type { OrgPaymentRecord } from "@/lib/domains/shared/types";
import { formatInr } from "@/lib/formatting";
import { useT } from "@/lib/i18n";
import { spacing, typography, useTheme } from "@/lib/theme";

export function RevenueSummary({
  revenuePaise,
  payments,
}: {
  revenuePaise: number;
  payments: OrgPaymentRecord[];
}) {
  const t = useT();
  const { palette } = useTheme();
  const manualTotal = payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
  return (
    <Card variant="selected" contentStyle={styles.card}>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: palette.text.secondary }]}>
          {t("owner.revenue.revenueToday")}
        </Text>
        <Text style={[styles.value, { color: palette.text.primary }]}>
          {formatInr(revenuePaise)}
        </Text>
      </View>
      <View style={[styles.metaPill, { backgroundColor: palette.surface.default }]}>
        <Text numberOfLines={1} style={[styles.metaText, { color: palette.text.secondary }]}>
          {t("owner.revenue.manualRecordsWithAmount", { amount: formatInr(manualTotal) })}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
  },
  copy: {
    gap: 2,
  },
  label: {
    ...typography.caption,
  },
  value: {
    ...typography.metric,
    fontVariant: ["tabular-nums"],
  },
  metaPill: {
    alignSelf: "flex-start",
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  metaText: {
    ...typography.small,
    fontVariant: ["tabular-nums"],
  },
});
