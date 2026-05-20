import { StyleSheet, View } from "react-native";

import { MetricTile } from "@/components/primitives";
import type { OrgPaymentRecord } from "@/lib/domains/shared/types";
import { formatInr } from "@/lib/formatting";

export function RevenueSummary({
  revenuePaise,
  payments,
}: {
  revenuePaise: number;
  payments: OrgPaymentRecord[];
}) {
  return (
    <View style={styles.metricGrid}>
      <MetricTile label="Revenue today" value={formatInr(revenuePaise)} detail="Membership + shop" tone="lime" style={styles.metricHalf} />
      <MetricTile
        label="Manual records"
        value={formatInr(payments.reduce((sum, payment) => sum + payment.amountPaise, 0))}
        detail="Cash and direct UPI"
        tone="amber"
        style={styles.metricHalf}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metricHalf: {
    flexBasis: "47%",
    flexGrow: 1,
  },
});
