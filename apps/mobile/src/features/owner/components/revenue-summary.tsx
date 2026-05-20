import { MetricGrid } from "@/components/domain/metric-grid";
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
    <MetricGrid
      items={[
        {
          label: "Revenue today",
          value: formatInr(revenuePaise),
          hint: "Membership + shop",
          tone: "lime",
        },
        {
          label: "Manual records",
          value: formatInr(payments.reduce((sum, payment) => sum + payment.amountPaise, 0)),
          hint: "Cash and direct UPI",
          tone: "amber",
        },
      ]}
    />
  );
}
